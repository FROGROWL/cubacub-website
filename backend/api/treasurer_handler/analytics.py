from collections import OrderedDict, defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.db.models import F
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Project, TreasurerSettings


@api_view(["GET"])
@permission_classes([AllowAny])
def budget_summary(request):
    total_budget = Project.objects.aggregate(total=Sum("budget"))["total"] or Decimal("0")
    total_spent = Project.objects.aggregate(total=Sum("spent"))["total"] or Decimal("0")
    available_budget = total_budget - total_spent

    settings_obj = TreasurerSettings.get_solo()
    annual_budget = settings_obj.annual_budget
    utilization_rate = float((total_spent / annual_budget * 100) if annual_budget > 0 else 0)

    palette = ["#1B263B", "#008080", "#00a89d", "#FF6B6B", "#FFD93D", "#8B5CF6"]
    category_totals = defaultdict(lambda: Decimal("0"))
    for project in Project.objects.all():
        category_totals[project.category or "Uncategorized"] += project.budget or Decimal("0")
    categories = []
    for idx, (name, value) in enumerate(sorted(category_totals.items(), key=lambda item: item[0])):
        color = palette[idx % len(palette)]
        categories.append(
            {
                "name": name,
                "value": float(value),
                "color": color,
                "fill": color,
            }
        )

    quarter_map = OrderedDict(
        (
            q,
            {
                "quarter": q,
                "budget": Decimal("0"),
                "spent": Decimal("0"),
            },
        )
        for q in ["Q1", "Q2", "Q3", "Q4"]
    )
    for project in Project.objects.all():
        if not project.startDate:
            continue
        quarter = f"Q{((project.startDate.month - 1) // 3) + 1}"
        quarter_map[quarter]["budget"] += project.budget or Decimal("0")
        quarter_map[quarter]["spent"] += project.spent or Decimal("0")

    completed_projects = Project.objects.filter(status="completed").count()
    on_track_projects = Project.objects.filter(status="ongoing", progress__gte=50).count()
    delayed_projects = Project.objects.filter(status="ongoing", progress__lt=50).count()

    return Response(
        {
            "totalBudget": float(total_budget),
            "totalSpent": float(total_spent),
            "availableBudget": float(available_budget),
            "utilizationRate": round(utilization_rate, 2),
            "categories": categories,
            "quarterly": [
                {
                    "quarter": value["quarter"],
                    "budget": float(value["budget"]),
                    "spent": float(value["spent"]),
                }
                for value in quarter_map.values()
            ],
            "completedProjects": completed_projects,
            "onTrackProjects": on_track_projects,
            "delayedProjects": delayed_projects,
            "overspentProjects": Project.objects.filter(budget__gt=0, spent__gt=F("budget")).count(),
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def monthly_spending(request):
    month_count = request.query_params.get("months", "6")
    try:
        month_count = max(3, min(12, int(month_count)))
    except ValueError:
        month_count = 6

    now = timezone.now().date()
    buckets = OrderedDict()

    for offset in range(month_count - 1, -1, -1):
        month = now.month - offset
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        label = date(year, month, 1).strftime("%b %Y")
        buckets[(year, month)] = {
            "month": label,
            "spent": Decimal("0"),
            "allocated": Decimal("0"),
        }

    for project in Project.objects.all():
        if not project.startDate:
            continue
        key = (project.startDate.year, project.startDate.month)
        if key not in buckets:
            continue
        buckets[key]["spent"] += project.spent or Decimal("0")
        buckets[key]["allocated"] += project.budget or Decimal("0")

    return Response(
        [
            {
                "month": data["month"],
                "spent": float(data["spent"]),
                "allocated": float(data["allocated"]),
            }
            for data in buckets.values()
        ]
    )
