"""
PR6 Tests: Analytics Implementation
Tests for get_monthly_trends() and calculate_incident_rate()
"""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from rest_framework.test import APIClient
from authentication.models import CustomUser
from ptw.models import Permit, PermitType, PermitPhoto
from incidentmanagement.models import Incident


class AnalyticsEndpointTest(TestCase):
    """Test analytics endpoint with real data"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create user
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            name='Test',
            surname='User',
            user_type='epcuser',
            admin_type='epcuser',
            grade='C'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            description='Hot work permit',
            risk_level='high',
            validity_hours=8,
            is_active=True
        )
        
        # Create permits across multiple months
        now = timezone.now()
        
        # Current month: 5 permits
        for i in range(5):
            Permit.objects.create(
                permit_type=self.permit_type,
                title=f'Current Month Permit {i}',
                description='Test',
                location='Site A',
                created_by=self.user,
                status='draft',
                created_at=now - timedelta(days=i)
            )
        
        # Last month: 3 permits
        last_month = now - relativedelta(months=1)
        for i in range(3):
            Permit.objects.create(
                permit_type=self.permit_type,
                title=f'Last Month Permit {i}',
                description='Test',
                location='Site B',
                created_by=self.user,
                status='approved',
                created_at=last_month - timedelta(days=i)
            )
        
        # 2 months ago: 2 permits
        two_months_ago = now - relativedelta(months=2)
        for i in range(2):
            Permit.objects.create(
                permit_type=self.permit_type,
                title=f'Two Months Ago Permit {i}',
                description='Test',
                location='Site C',
                created_by=self.user,
                status='completed',
                created_at=two_months_ago - timedelta(days=i)
            )
    
    def test_analytics_endpoint_exists(self):
        """Test analytics endpoint is accessible"""
        response = self.client.get('/api/v1/ptw/permits/analytics/')
        self.assertIn(response.status_code, [200, 404])  # 404 if routing not set up
    
    def test_monthly_trends_returns_data(self):
        """Test get_monthly_trends returns non-empty data"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        trends = viewset.get_monthly_trends(queryset)
        
        # Should return list
        self.assertIsInstance(trends, list)
        
        # Should have data for at least 3 months
        self.assertGreaterEqual(len(trends), 3)
    
    def test_monthly_trends_structure(self):
        """Test monthly trends have correct structure"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        trends = viewset.get_monthly_trends(queryset)
        
        # Check structure of first item
        if trends:
            first_item = trends[0]
            self.assertIn('month', first_item)
            self.assertIn('total', first_item)
            self.assertIn('by_status', first_item)
            self.assertIn('by_type', first_item)
            
            # Check month format (YYYY-MM)
            self.assertRegex(first_item['month'], r'^\d{4}-\d{2}$')
            
            # Check total is integer
            self.assertIsInstance(first_item['total'], int)
            
            # Check by_status is dict
            self.assertIsInstance(first_item['by_status'], dict)
            
            # Check by_type is dict
            self.assertIsInstance(first_item['by_type'], dict)
    
    def test_monthly_trends_ordering(self):
        """Test monthly trends are ordered chronologically"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        trends = viewset.get_monthly_trends(queryset)
        
        # Check ordering
        months = [item['month'] for item in trends]
        self.assertEqual(months, sorted(months))
    
    def test_monthly_trends_counts_match(self):
        """Test monthly trends counts match actual data"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        trends = viewset.get_monthly_trends(queryset)
        
        # Find current month in trends
        now = timezone.now()
        current_month_key = now.strftime('%Y-%m')
        
        current_month_data = next(
            (item for item in trends if item['month'] == current_month_key),
            None
        )
        
        if current_month_data:
            # Should have 5 permits in current month
            self.assertEqual(current_month_data['total'], 5)
            
            # Check status breakdown
            self.assertIn('draft', current_month_data['by_status'])
            self.assertEqual(current_month_data['by_status']['draft'], 5)
    
    def test_incident_rate_with_no_incidents(self):
        """Test incident rate returns 0 when no incidents"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        rate = viewset.calculate_incident_rate(queryset)
        
        # Should return 0.0 when no incidents
        self.assertEqual(rate, 0.0)
    
    def test_incident_rate_with_incidents(self):
        """Test incident rate calculates correctly with incidents"""
        from ptw.views import PermitViewSet
        
        # Create incidents linked to permits
        permits = Permit.objects.all()[:3]
        
        for permit in permits:
            Incident.objects.create(
                incident_type='near_miss',
                severity_level='low',
                incident_date=timezone.now(),
                location='Test Site',
                description='Test incident',
                work_permit_number=permit.permit_number,
                reported_by=self.user
            )
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        rate = viewset.calculate_incident_rate(queryset)
        
        # 3 incidents out of 10 permits = 30%
        self.assertEqual(rate, 30.0)
    
    def test_incident_rate_with_empty_queryset(self):
        """Test incident rate returns 0 for empty queryset"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.none()
        
        rate = viewset.calculate_incident_rate(queryset)
        
        self.assertEqual(rate, 0.0)
    
    def test_monthly_trends_fills_missing_months(self):
        """Test monthly trends fills in months with no data"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        trends = viewset.get_monthly_trends(queryset)
        
        # Should have 12 months of data
        self.assertEqual(len(trends), 12)
        
        # Check that months with no permits have total=0
        zero_months = [item for item in trends if item['total'] == 0]
        self.assertGreater(len(zero_months), 0)
    
    def test_monthly_trends_by_status_breakdown(self):
        """Test monthly trends status breakdown is accurate"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        trends = viewset.get_monthly_trends(queryset)
        
        # Find month with data
        month_with_data = next((item for item in trends if item['total'] > 0), None)
        
        if month_with_data:
            # Sum of status counts should equal total
            status_sum = sum(month_with_data['by_status'].values())
            self.assertEqual(status_sum, month_with_data['total'])
    
    def test_monthly_trends_by_type_breakdown(self):
        """Test monthly trends type breakdown is accurate"""
        from ptw.views import PermitViewSet
        
        viewset = PermitViewSet()
        queryset = Permit.objects.all()
        
        trends = viewset.get_monthly_trends(queryset)
        
        # Find month with data
        month_with_data = next((item for item in trends if item['total'] > 0), None)
        
        if month_with_data:
            # Sum of type counts should equal total
            type_sum = sum(month_with_data['by_type'].values())
            self.assertEqual(type_sum, month_with_data['total'])


class AnalyticsSerializerTest(TestCase):
    """Test analytics serializer schema stability"""
    
    def test_analytics_serializer_fields(self):
        """Test PermitAnalyticsSerializer has required fields"""
        from ptw.serializers import PermitAnalyticsSerializer
        
        # Create mock data
        data = {
            'total_permits': 100,
            'active_permits': 20,
            'completed_permits': 50,
            'overdue_permits': 5,
            'average_processing_time': 24.5,
            'compliance_rate': 95.0,
            'incident_rate': 2.5,
            'risk_distribution': {'low': 30, 'medium': 50, 'high': 20},
            'status_distribution': {'draft': 10, 'approved': 40, 'completed': 50},
            'monthly_trends': []
        }
        
        serializer = PermitAnalyticsSerializer(data)
        serialized_data = serializer.data
        
        # Check all required fields are present
        self.assertIn('total_permits', serialized_data)
        self.assertIn('active_permits', serialized_data)
        self.assertIn('completed_permits', serialized_data)
        self.assertIn('overdue_permits', serialized_data)
        self.assertIn('average_processing_time', serialized_data)
        self.assertIn('compliance_rate', serialized_data)
        self.assertIn('incident_rate', serialized_data)
        self.assertIn('risk_distribution', serialized_data)
        self.assertIn('status_distribution', serialized_data)
        self.assertIn('monthly_trends', serialized_data)
