// Test script to verify EPFO-compliant PF calculations
// This tests the 6-component calculation system

const calculatePFTest = () => {
  // Mock PF_CONSTANTS
  const PF_CONSTANTS = {
    WAGE_CEILING: 15000,
    EPF_RATE_EMPLOYEE: 0.12,
    EPF_RATE_EMPLOYER: 0.12,
    EPS_RATE_EMPLOYER: 0.0833,
    EDLI_RATE_EMPLOYER: 0.005,
    ADMIN_CHARGE_RATE: 0.0017,
    EDLI_ADMIN_RATE: 0.0001,
    NCP_DAYS: 0,
    REFUND_ADVANCES: 0,
  };

  const calculatePF = (grossSalary) => {
    const gross = parseFloat(grossSalary) || 0;

    // Gross wages capped at ceiling
    const pfWages = Math.min(gross, PF_CONSTANTS.WAGE_CEILING);
    const epfWages = pfWages;
    const epsWages = pfWages;
    const edliWages = pfWages;

    // Employee contribution (12% of PF wages)
    const epfEE = Math.round(pfWages * PF_CONSTANTS.EPF_RATE_EMPLOYEE);

    // Employer contributions (all 6 components):
    const eps = Math.round(epsWages * PF_CONSTANTS.EPS_RATE_EMPLOYER);
    const epfER = Math.round(epfWages * (PF_CONSTANTS.EPF_RATE_EMPLOYER - PF_CONSTANTS.EPS_RATE_EMPLOYER));
    const edli = Math.round(edliWages * PF_CONSTANTS.EDLI_RATE_EMPLOYER);
    const adminCharge = Math.round(pfWages * PF_CONSTANTS.ADMIN_CHARGE_RATE);
    const edliAdminCharge = Math.round(edliWages * PF_CONSTANTS.EDLI_ADMIN_RATE);

    // Total employer contribution
    const totalEmployerContribution = eps + epfER + edli + adminCharge + edliAdminCharge;
    const totalContribution = epfEE + totalEmployerContribution;

    return {
      grossWages: gross,
      pfWages: pfWages,
      epfWages: epfWages,
      epsWages: epsWages,
      edliWages: edliWages,
      epfEE: epfEE,
      eps: eps,
      epfER: epfER,
      edli: edli,
      adminCharge: adminCharge,
      edliAdminCharge: edliAdminCharge,
      totalEmployerContribution: totalEmployerContribution,
      totalContribution: totalContribution,
    };
  };

  // Test cases from EPFO spec
  const testCases = [
    {
      name: 'Just Below Ceiling (₹14,999)',
      input: 14999,
      expected: {
        epfEE: 1800,
        eps: 1250,
        epfER: 551,
        edli: 75,
        adminCharge: 25,
        edliAdminCharge: 1
      }
    },
    {
      name: 'At Ceiling (₹15,000)',
      input: 15000,
      expected: {
        epfEE: 1800,
        eps: 1250,
        epfER: 551,
        edli: 75,
        adminCharge: 25,
        edliAdminCharge: 1
      }
    },
    {
      name: 'Above Ceiling (₹20,000)',
      input: 20000,
      expected: {
        epfEE: 1800,
        eps: 1250,
        epfER: 551,
        edli: 75,
        adminCharge: 25,
        edliAdminCharge: 1
      }
    },
    {
      name: 'Small Amount (₹5,000)',
      input: 5000,
      expected: {
        epfEE: 600,
        eps: 417,
        epfER: 183,
        edli: 25,
        adminCharge: 8,
        edliAdminCharge: 0
      }
    }
  ];

  console.log('EPFO-Compliant PF Calculation Tests\n');
  console.log('=====================================\n');

  let passCount = 0;
  let failCount = 0;

  testCases.forEach(testCase => {
    console.log(`Test: ${testCase.name}`);
    console.log(`Input: ₹${testCase.input}`);
    
    const result = calculatePF(testCase.input);
    const expected = testCase.expected;
    
    const isPass = 
      result.epfEE === expected.epfEE &&
      result.eps === expected.eps &&
      result.epfER === expected.epfER &&
      result.edli === expected.edli &&
      result.adminCharge === expected.adminCharge &&
      result.edliAdminCharge === expected.edliAdminCharge;

    if (isPass) {
      console.log('✅ PASS');
      passCount++;
    } else {
      console.log('❌ FAIL');
      failCount++;
      console.log(`  Expected: EPF EE: ${expected.epfEE}, EPS: ${expected.eps}, EPF ER: ${expected.epfER}, EDLI: ${expected.edli}, Admin: ${expected.adminCharge}, EDLI Admin: ${expected.edliAdminCharge}`);
      console.log(`  Got:      EPF EE: ${result.epfEE}, EPS: ${result.eps}, EPF ER: ${result.epfER}, EDLI: ${result.edli}, Admin: ${result.adminCharge}, EDLI Admin: ${result.edliAdminCharge}`);
    }
    console.log('');
  });

  console.log(`\nSummary: ${passCount} passed, ${failCount} failed out of ${testCases.length} tests`);
  console.log('=====================================\n');
};

// Run tests
calculatePFTest();
