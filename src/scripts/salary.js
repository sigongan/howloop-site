import {initSalaryCalculator} from './salary-controller.mjs';
import {PAYROLL} from '../data/payroll-2026.mjs';
import earnings from '../data/earnings-may2025.json';
initSalaryCalculator(document.querySelector('.salary-page'),{PAYROLL,earnings});
