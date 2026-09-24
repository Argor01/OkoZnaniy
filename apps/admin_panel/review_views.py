from django.db import transaction
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.experts.models import ExpertReview, ExpertStatistics
from apps.orders.models import ClientReview
from .models import AdminActionLog

class ReviewStaffPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_active
                    and request.user.role in ('admin', 'director'))

def review_payload(review, kind):
    author = review.client if kind == 'expert' else review.expert
    target = review.expert if kind == 'expert' else review.client
    return {'id': review.pk, 'kind': kind, 'author': author.get_full_name() or author.username,
            'target': target.get_full_name() or target.username, 'order_id': review.order_id,
            'rating': review.rating, 'comment': review.comment,
            'created_at': review.created_at.isoformat(),
            'is_published': getattr(review, 'is_published', True)}

@api_view(['GET'])
@permission_classes([IsAuthenticated, ReviewStaffPermission])
def list_reviews(request):
    kind = request.query_params.get('kind', 'expert')
    if kind not in ('expert', 'client'):
        raise ValidationError({'kind': 'Выберите отзывы клиентов или экспертов.'})
    model = ExpertReview if kind == 'expert' else ClientReview
    qs = model.objects.select_related('expert', 'client').order_by('-created_at', '-pk')
    term = request.query_params.get('search', '').strip()[:200]
    if term:
        query = Q(comment__icontains=term) | Q(client__username__icontains=term) | Q(expert__username__icontains=term)
        if term.isdigit():
            query |= Q(order_id=int(term))
        qs = qs.filter(query)
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (ValueError, TypeError):
        raise ValidationError({'page': 'Некорректная страница.'})
    return Response({'count': qs.count(), 'results': [review_payload(r, kind) for r in qs[(page-1)*25:page*25]]})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, ReviewStaffPermission])
def delete_review(request, kind, review_id):
    if kind not in ('expert', 'client'):
        raise ValidationError({'kind': 'Некорректный тип отзыва.'})
    reason = str(request.data.get('reason', '')).strip()
    if not 3 <= len(reason) <= 1000:
        raise ValidationError({'reason': 'Укажите причину удаления (от 3 до 1000 символов).'})
    model = ExpertReview if kind == 'expert' else ClientReview
    with transaction.atomic():
        review = get_object_or_404(model.objects.select_for_update(), pk=review_id)
        target = review.expert if kind == 'expert' else review.client
        snapshot = review_payload(review, kind)
        AdminActionLog.objects.create(actor=request.user, target_user=target,
            action='review_deleted', object_type=kind + '_review', object_id=str(review.pk),
            description='Удаление отзыва: ' + reason, meta={'reason': reason, 'review': snapshot})
        expert_id = review.expert_id
        review.delete()
        if kind == 'expert':
            totals = ExpertReview.objects.filter(expert_id=expert_id, is_published=True).aggregate(avg=Avg('rating'), count=Count('id'))
            ExpertStatistics.objects.update_or_create(expert_id=expert_id, defaults={
                'average_rating': round(totals['avg'] or 0, 2), 'total_ratings': totals['count']})
    return Response(status=204)
