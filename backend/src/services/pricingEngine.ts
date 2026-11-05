import { IProduct, IQuoteLineItem } from '../models';
import { getUnitMonthlyPrice } from './catalogueEngine';

export interface PriceCalculationInputItem {
  product: IProduct;
  quantity: number;
}

export interface PriceCalculationResult {
  items: IQuoteLineItem[];
  monthlyTotalInr: number;
  setupTotalInr: number;
  contractMonths: number;
  contractTotalValueInr: number;
  estimatedInstallDays: number;
}

export function calculateBundlePricing(
  inputItems: PriceCalculationInputItem[],
  requestedContractMonths?: number
): PriceCalculationResult {
  const minRequiredContract = inputItems.reduce(
    (max, { product }) => Math.max(max, product.minContractMonths),
    1
  );
  const contractMonths = Math.max(minRequiredContract, requestedContractMonths || 12);

  const items: IQuoteLineItem[] = inputItems.map(({ product, quantity }) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const unitMonthly = getUnitMonthlyPrice(product, contractMonths);
    const unitSetup = product.oneTimeSetupInr;
    return {
      productId: product.productId,
      productName: product.productName,
      category: product.category,
      unit: product.unit,
      quantity: qty,
      snapshotUnitMonthlyPriceInr: unitMonthly,
      snapshotUnitSetupFeeInr: unitSetup,
      lineMonthlyTotalInr: unitMonthly * qty,
      lineSetupTotalInr: unitSetup * qty,
      minContractMonths: product.minContractMonths,
      typicalInstallDays: product.typicalInstallDays,
    };
  });

  const monthlyTotalInr = items.reduce((sum, i) => sum + i.lineMonthlyTotalInr, 0);
  const setupTotalInr = items.reduce((sum, i) => sum + i.lineSetupTotalInr, 0);
  const contractTotalValueInr = monthlyTotalInr * contractMonths + setupTotalInr;
  const estimatedInstallDays = items.reduce((max, i) => Math.max(max, i.typicalInstallDays), 1);

  return {
    items,
    monthlyTotalInr,
    setupTotalInr,
    contractMonths,
    contractTotalValueInr,
    estimatedInstallDays,
  };
}

export interface ROICalculationInput {
  currentExpenditures: {
    broadbandAndInternetInr: number;
    mobileAndSimsInr: number;
    posAndBillingSoftwareInr: number;
    cloudAndEmailToolsInr: number;
    cctvAndSecurityInr: number;
    whatsappAndMarketingInr: number;
    downtimeHoursPerMonth?: number;
    estimatedRevenueLossPerHourInr?: number;
  };
  proposedBundleItems: PriceCalculationInputItem[];
  contractMonths?: number;
}

export function calculateROIAndSavings(input: ROICalculationInput) {
  const exp = input.currentExpenditures;
  const directCurrentMonthlyInr =
    (Number(exp.broadbandAndInternetInr) || 0) +
    (Number(exp.mobileAndSimsInr) || 0) +
    (Number(exp.posAndBillingSoftwareInr) || 0) +
    (Number(exp.cloudAndEmailToolsInr) || 0) +
    (Number(exp.cctvAndSecurityInr) || 0) +
    (Number(exp.whatsappAndMarketingInr) || 0);

  const downtimeHours = Number(exp.downtimeHoursPerMonth) || 0;
  const lossPerHour = Number(exp.estimatedRevenueLossPerHourInr) || 0;
  const estimatedDowntimeRiskReductionInr = Math.round(downtimeHours * lossPerHour * 0.75);

  const pricing = calculateBundlePricing(input.proposedBundleItems, input.contractMonths);

  const directMonthlySavingsInr = directCurrentMonthlyInr - pricing.monthlyTotalInr;
  const netMonthlyValueGainInr = directMonthlySavingsInr + estimatedDowntimeRiskReductionInr;
  const directAnnualSavingsInr = directMonthlySavingsInr * 12;
  const netAnnualValueGainInr = netMonthlyValueGainInr * 12;
  const contractPeriodCurrentCostInr = directCurrentMonthlyInr * pricing.contractMonths;
  const contractPeriodProposedCostInr = pricing.contractTotalValueInr;

  return {
    disclaimer:
      'ESTIMATED COMPARISON ONLY: Savings and downtime risk reductions are estimates based on customer-entered expenditures and catalogue unit prices. They are not guaranteed financial outcomes.',
    currentMonthlyDirectSpendInr: directCurrentMonthlyInr,
    estimatedMonthlyDowntimeRiskInr: downtimeHours * lossPerHour,
    proposedMonthlyRecurringInr: pricing.monthlyTotalInr,
    proposedOneTimeSetupInr: pricing.setupTotalInr,
    contractMonths: pricing.contractMonths,
    proposedContractTotalValueInr: contractPeriodProposedCostInr,
    currentContractPeriodDirectSpendInr: contractPeriodCurrentCostInr,
    estimatedDirectMonthlySavingsInr: directMonthlySavingsInr,
    estimatedDirectAnnualSavingsInr: directAnnualSavingsInr,
    estimatedMonthlyDowntimeSavingsInr: estimatedDowntimeRiskReductionInr,
    estimatedTotalMonthlyBenefitInr: netMonthlyValueGainInr,
    estimatedTotalAnnualBenefitInr: netAnnualValueGainInr,
    paybackMonthsForSetup:
      netMonthlyValueGainInr > 0 && pricing.setupTotalInr > 0
        ? Number((pricing.setupTotalInr / netMonthlyValueGainInr).toFixed(1))
        : 0,
    lineItems: pricing.items,
    assumptions: [
      `Catalogue unit prices use minimum contract commitment (${pricing.contractMonths} months).`,
      'Taxes (18% GST) and customer premises civil wiring outside standard installation are excluded.',
      downtimeHours > 0
        ? `Assumes 75% reduction in ${downtimeHours} hrs/month connectivity downtime via enterprise SLA / failover.`
        : 'Direct bill-to-bill comparison excluding indirect productivity gains.',
    ],
  };
}
