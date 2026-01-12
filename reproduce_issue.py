import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.catalog.models import Subject, WorkType, Complexity
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.orders.views import OrderViewSet

User = get_user_model()

def run():
    # Create a test client
    client_username = 'test_client_repro'
    try:
        client = User.objects.get(username=client_username)
        print(f"User {client_username} already exists.")
    except User.DoesNotExist:
        client = User.objects.create_user(username=client_username, password='password', role='client')
        print(f"User {client_username} created.")

    # Create catalog items if they don't exist
    subject, _ = Subject.objects.get_or_create(name='Test Subject', slug='test-subject')
    work_type, _ = WorkType.objects.get_or_create(name='Test Work Type', slug='test-work-type')
    complexity, _ = Complexity.objects.get_or_create(name='Test Complexity', slug='test-complexity')

    # Create an order via ViewSet
    factory = APIRequestFactory()
    
    # Create request data
    data = {
        'title': f'Test Order API {timezone.now().timestamp()}',
        'description': 'Test Description API',
        'subject_id': subject.id,
        'work_type_id': work_type.id,
        'complexity_id': complexity.id,
        'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
        'budget': 1000
    }
    
    view_create = OrderViewSet.as_view({'post': 'create'})
    request_create = factory.post('/orders/orders/', data, format='json')
    force_authenticate(request_create, user=client)
    
    response_create = view_create(request_create)
    print(f"Create response status: {response_create.status_code}")
    if response_create.status_code != 201:
        print(f"Create error: {response_create.data}")
        return

    order_id = response_create.data['id']
    order = Order.objects.get(id=order_id)
    print(f"Order created via API with ID {order.id} and status '{order.status}'.")

    # Check if it appears in available orders
    view_list = OrderViewSet.as_view({'get': 'available'})
    request_list = factory.get('/orders/orders/available/')
    force_authenticate(request_list, user=client)
    
    response = view_list(request_list)
    print(f"List response status: {response.status_code}")
    
    if hasattr(response, 'data'):
        data = response.data
        results = data.get('results', data) if isinstance(data, dict) else data
        
        found = False
        for item in results:
            if item['id'] == order.id:
                found = True
                break
        
        if found:
            print("SUCCESS: Order found in available list.")
        else:
            print("FAILURE: Order NOT found in available list.")
            print(f"Total orders returned: {len(results)}")
            if len(results) > 0:
                print(f"First order ID: {results[0]['id']}")
    else:
        print("Response has no data.")

if __name__ == '__main__':
    run()
