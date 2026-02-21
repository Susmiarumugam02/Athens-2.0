from decimal import Decimal
from django.db import models
from django.utils import timezone
from .models import (
    Employee, Attendance, PayrollCycle, PayrollEntry, 
    PayrollSettings, Fine, Advance
)

class PayrollService:
    """
    Standalone payroll processing service.
    Reads from Employee and Attendance modules.
    Never modifies them.
    """
    
    @staticmethod
    def get_attendance_summary(employee, period_from, period_to):
        """Get attendance summary for an employee in a period"""
        attendance_data = Attendance.objects.filter(
            employee=employee,
            date__gte=period_from,
            date__lte=period_to
        )
        
        total_days = attendance_data.filter(status='P').count()
        paid_leave_days = attendance_data.filter(status='L').count()
        unpaid_leave_days = attendance_data.filter(status='A').count()
        overtime_hours = sum([a.overtime_hours for a in attendance_data])
        
        return {
            'total_days_worked': total_days,
            'paid_leave_days': paid_leave_days,
            'unpaid_leave_days': unpaid_leave_days,
            'overtime_hours': Decimal(str(overtime_hours))
        }
    
    @staticmethod
    def calculate_earnings(employee, attendance_summary, settings):
        """Calculate earnings based on wage structure"""
        basic = employee.basic_structure
        da = employee.da_structure
        hra = employee.hra_structure
        other_allowances = employee.other_allowances_structure
        
        # Calculate overtime wages
        ot_wages = (
            attendance_summary['overtime_hours'] * 
            employee.overtime_rate * 
            settings.ot_multiplier
        )
        
        gross_salary = basic + da + hra + other_allowances + ot_wages
        
        return {
            'basic_earned': basic,
            'da_earned': da,
            'hra_earned': hra,
            'other_allowances': other_allowances,
            'overtime_wages': ot_wages,
            'gross_salary': gross_salary
        }
    
    @staticmethod
    def calculate_deductions(employee, earnings, period_from, period_to, settings):
        """Calculate all deductions"""
        gross = earnings['gross_salary']
        basic = earnings['basic_earned']
        
        # Statutory deductions
        pf_employee = (basic * (settings.pf_rate / 100)) if employee.pf_applicable else Decimal('0')
        esi_employee = (gross * (settings.esi_rate / 100)) if employee.esi_applicable else Decimal('0')
        
        # Fines
        fines_total = Fine.objects.filter(
            employee=employee,
            fine_date__gte=period_from,
            fine_date__lte=period_to
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
        
        # Advances
        advances_total = Advance.objects.filter(
            employee=employee,
            advance_date__gte=period_from,
            advance_date__lte=period_to,
            status='approved'
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
        
        total_deductions = pf_employee + esi_employee + fines_total + advances_total
        
        return {
            'pf_employee': pf_employee,
            'esi_employee': esi_employee,
            'professional_tax': Decimal('0'),  # Can be implemented based on state rules
            'fines': fines_total,
            'advances': advances_total,
            'other_deductions': Decimal('0'),
            'total_deductions': total_deductions
        }
    
    @staticmethod
    def process_payroll_cycle(cycle, tenant_id):
        """
        Main payroll processing logic.
        Independent and microservice-ready.
        """
        if cycle.status != 'draft':
            raise ValueError('Only draft cycles can be processed')
        
        settings = PayrollSettings.objects.filter(athens_tenant_id=tenant_id).first()
        if not settings:
            raise ValueError('Payroll settings not configured')
        
        employees = Employee.objects.filter(
            athens_tenant_id=tenant_id, 
            status='active'
        )
        
        entries_created = 0
        
        for employee in employees:
            # Step 1: Get attendance summary (read-only)
            attendance_summary = PayrollService.get_attendance_summary(
                employee, cycle.period_from, cycle.period_to
            )
            
            # Step 2: Calculate earnings
            earnings = PayrollService.calculate_earnings(
                employee, attendance_summary, settings
            )
            
            # Step 3: Calculate deductions
            deductions = PayrollService.calculate_deductions(
                employee, earnings, cycle.period_from, cycle.period_to, settings
            )
            
            # Step 4: Calculate net salary
            net_salary = earnings['gross_salary'] - deductions['total_deductions']
            
            # Step 5: Create payroll entry
            PayrollEntry.objects.create(
                athens_tenant_id=tenant_id,
                payroll_cycle=cycle,
                employee=employee,
                total_days_worked=attendance_summary['total_days_worked'],
                paid_leave_days=attendance_summary['paid_leave_days'],
                unpaid_leave_days=attendance_summary['unpaid_leave_days'],
                overtime_hours=attendance_summary['overtime_hours'],
                basic_earned=earnings['basic_earned'],
                da_earned=earnings['da_earned'],
                hra_earned=earnings['hra_earned'],
                other_allowances=earnings['other_allowances'],
                overtime_wages=earnings['overtime_wages'],
                gross_salary=earnings['gross_salary'],
                pf_employee=deductions['pf_employee'],
                esi_employee=deductions['esi_employee'],
                professional_tax=deductions['professional_tax'],
                fines=deductions['fines'],
                advances=deductions['advances'],
                other_deductions=deductions['other_deductions'],
                total_deductions=deductions['total_deductions'],
                net_salary=net_salary
            )
            
            entries_created += 1
        
        # Update cycle status
        cycle.status = 'processed'
        cycle.processed_at = timezone.now()
        cycle.save()
        
        return {
            'success': True,
            'entries_created': entries_created,
            'message': f'Payroll processed for {entries_created} employees'
        }
    
    @staticmethod
    def validate_minimum_wage(employee, net_salary, settings):
        """Validate against minimum wage requirements"""
        # This can be implemented based on state/category rules
        # For now, it's a placeholder
        return True
    
    @staticmethod
    def calculate_bonus(employee, accounting_year, settings):
        """Calculate annual bonus (8.33% - 20%)"""
        # Get total salary for the year
        payroll_entries = PayrollEntry.objects.filter(
            employee=employee,
            payroll_cycle__period_from__year=accounting_year
        )
        
        total_salary = payroll_entries.aggregate(
            total=models.Sum('gross_salary')
        )['total'] or Decimal('0')
        
        # Calculate bonus (default 8.33%)
        bonus_percentage = settings.bonus_min_percent
        bonus_amount = total_salary * (bonus_percentage / 100)
        
        return {
            'total_salary_for_year': total_salary,
            'bonus_percentage': bonus_percentage,
            'bonus_amount': bonus_amount
        }
