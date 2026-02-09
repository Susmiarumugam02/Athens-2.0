from django.test import TestCase
from rest_framework.test import APIClient
from tests_common.fixtures import create_ptw_permit_fixtures, create_test_user


class PermitSignaturePermissionTests(TestCase):
    def setUp(self):
        fixtures = create_ptw_permit_fixtures()
        self.permit = fixtures['permit']
        self.project = fixtures['project']
        self.requestor = fixtures['user']

        self.verifier = create_test_user(username='verifier', project=self.project, admin_type='epcuser')
        self.approver = create_test_user(username='approver', project=self.project, admin_type='clientuser')
        self.other_user = create_test_user(username='otheruser', project=self.project, admin_type='contractoruser')

        self.permit.verifier = self.verifier
        self.permit.approver = self.approver
        self.permit.save(update_fields=['verifier', 'approver'])

        self.client = APIClient()

    def test_creator_can_add_requestor_signature(self):
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'requestor',
                'signature_data': 'data:image/png;base64,AAAA'
            },
            format='json'
        )
        self.assertEqual(response.status_code, 200)

    def test_assigned_verifier_can_add_verifier_signature(self):
        self.client.force_authenticate(user=self.verifier)
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'verifier',
                'signature_data': 'data:image/png;base64,AAAA'
            },
            format='json'
        )
        self.assertEqual(response.status_code, 200)

    def test_non_assigned_user_cannot_add_approver_signature(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'approver',
                'signature_data': 'data:image/png;base64,AAAA'
            },
            format='json'
        )
        self.assertEqual(response.status_code, 403)

    def test_invalid_signature_type_rejected(self):
        self.client.force_authenticate(user=self.requestor)
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/add_signature/',
            {
                'signature_type': 'not_a_type',
                'signature_data': 'data:image/png;base64,AAAA'
            },
            format='json'
        )
        self.assertEqual(response.status_code, 400)
