
const ANALYTIC_NAMES: Record<string, string> = {
    'NFV4-FR': 'Face Recognition',
    'NFV4H-FR': 'Face Recognition (Hybrid)',
    'NFV4-LPR2': 'License Plate Recognition',
    'NFV4-MPAA': 'People Counting',
    'NFV4-VC': 'Vehicle Counting',
    'NFV4-CE': 'Crowd Estimation',
    'NFV4-PPE': 'Personal Protective Equipment Analytic',
    'NFV4D-OVOD': 'OVOD',
    'NFV4-VD': 'Vehicle Dwelling',
    'NFV4-MVA': 'Multi Vehicle Analytic'
};

export const analyticName = (analyticId: string): string => ANALYTIC_NAMES[analyticId] ?? analyticId;


export const seatAnalyticId = (analyticId: string): string =>
    analyticId === 'NFV4-VC' || analyticId === 'NFV4-VD' ? 'NFV4-MVA' : analyticId;

export default ANALYTIC_NAMES;
