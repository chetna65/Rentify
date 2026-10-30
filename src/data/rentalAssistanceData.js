export const rentalAssistanceData = {
  scamAlerts: [
    {
      id: "scam-fake-owner",
      title: "The 'Fake Owner' / Caretaker Impersonation Scam",
      frequency: "High (Documented across 99acres & classifieds)",
      summary: "Someone with temporary or unauthorized access (a distant relative, caretaker, broker, or ex-tenant) poses as the lawful owner, advertises the unit at an attractive price, and collects hefty security deposits before vanishing.",
      redFlags: [
        "Lister claims to be out of town / abroad in the army / on medical duty and cannot meet in person",
        "Refuses to produce the original Index II registered title deed or latest property tax receipt",
        "Aadhaar card name does not match the name recorded in the Sub-Registrar / IGR property document",
        "Rushes the prospective tenant to transfer a token deposit before inspecting the physical flat"
      ],
      rentifyDefense: "Rentify requires every lister to submit an official government property ownership document (Index II / 7/12 extract / municipal tax receipt) and cross-checks the name against Aadhaar biometric records before field assignment."
    },
    {
      id: "scam-token-deposit",
      title: "Advance 'Booking Token' / Visiting Pass Fraud",
      frequency: "Very High (Common in Student Hubs & PG Relocations)",
      summary: "Fraudsters post stolen photos of luxury apartments at 50–70% below prevailing market rent. When interested renters call, they demand an upfront 'gate pass fee', 'society visiting charge', or 'refundable ₹2,000 token' via UPI before revealing the flat number.",
      redFlags: [
        "Unrealistically cheap rent for a prime neighborhood (e.g. ₹8,000 for a 3BHK in Dharampeth or Viman Nagar)",
        "Demands an immediate UPI transfer before you have seen the inside of the property",
        "Sends a fake digital 'gate security pass' or military canteen card to feign credibility",
        "Insists that 5 other parties are standing downstairs with cash right now"
      ],
      rentifyDefense: "Rentify marks any listing below 40% of the locality median as a price-anomaly flag and sends an on-ground Verification Partner to confirm physical availability before public customer discovery."
    },
    {
      id: "scam-multi-deposit",
      title: "Multiple Deposit / Sub-Letting Scheme",
      frequency: "Moderate (Multi-tenant fraud)",
      summary: "An existing tenant or rogue leaseholder schedules visits on a single weekend, signs informal stamp-paper agreements with 4 to 6 different prospective tenants simultaneously, collects 2 months deposit from each, and absconds overnight.",
      redFlags: [
        "Lister only produces a photocopy or soft-copy of an older agreement without society approval",
        "Society security guard or society office manager expresses unawareness about any new tenancy",
        "Insists on cash payments or multiple different personal UPI handles",
        "Avoids introducing the building society management committee or secretary"
      ],
      rentifyDefense: "Field Verification Partners physically meet building society management committees or registered society secretaries, cross-referencing Society NOCs and verifying active occupancy status."
    },
    {
      id: "scam-upi-refund",
      title: "The UPI QR-Code 'Refund / Verification' Trap",
      frequency: "High (Cybercrime syndicates)",
      summary: "The fraudster sends a QR code claiming 'scan this QR code to receive your booking token refund' or 'verify bank account'. In reality, scanning and entering your UPI PIN authorizes a DEBIT from your bank account, not a credit.",
      redFlags: [
        "Any party instructing you to enter your UPI PIN to 'receive' money (UPI PIN is ONLY required to send money)",
        "QR codes received via WhatsApp with captions like 'Scan here to claim verification credit'",
        "Callers pretending to be army officers, CISF personnel, or housing portal billing executives"
      ],
      rentifyDefense: "Rentify operates an on-platform audit trail and strictly educates tenants: No verification or refund in Indian banking ever requires entering a UPI PIN."
    }
  ],

  legalGuidance: [
    {
      id: "legal-mta",
      topic: "Model Tenancy Act (MTA) 2021 & Deposit Caps",
      importance: "Statutory Protection",
      rule: "Maximum 2 Months' Rent for Residential Housing",
      details: "Under the Model Tenancy Act (MTA) proposed by the Central Government and adopted across reforming states, landlords are strictly legally capped at charging a maximum of 2 months' rent as security deposit for residential dwellings (and 1 month for commercial). This directly outlaws the archaic, coercive practice in Bangalore and Mumbai of demanding 6 to 11 months' rent upfront.",
      keyClauses: [
        "Security deposit must be refunded to the tenant upon vacation, after deducting reasonable unpaid bills",
        "Mandatory 24-hour advance written notice (via SMS, WhatsApp, or letter) before the owner or their agent visits the premises",
        "Rent cannot be revised midway through an active agreement without written terms agreed 90 days in advance"
      ]
    },
    {
      id: "legal-rera-gap",
      topic: "The RERA Regulatory Gap for Renters",
      importance: "Critical Renter Awareness",
      rule: "RERA Does NOT Protect Individual Residential Rental Agreements",
      details: "A widespread misconception among Indian tenants is that the Real Estate (Regulation and Development) Act, 2016 (RERA) oversees rental fraud. In legal reality, RERA applies almost exclusively to builder-buyer sales, project delays, and commercial developer disclosures. Individual secondary rental tenancies fall entirely outside RERA jurisdiction, leaving renters reliant on local Rent Control Acts or civil courts.",
      keyClauses: [
        "RERA Appellate Tribunals do not adjudicate individual landlord-tenant security deposit withholding",
        "This regulatory vacuum is why independent document verification (Index II / 7/12 cross-check) is essential before paying deposits",
        "Always execute a registered Leave & License Agreement rather than an unnotarized 100-rupee stamp paper"
      ]
    },
    {
      id: "legal-brokerage",
      topic: "Brokerage Norms & Intermediary Costs",
      importance: "Cost Transparency",
      rule: "Zero Standard Brokerage on Direct-to-Owner Platforms",
      details: "Conventional offline brokers in Indian metros charge 1 month's full rent as commission from both tenant and owner (amounting to 2 months rent extracted from the ecosystem), scaling to 2-3 months in competitive tech hubs like Whitefield or BKC.",
      keyClauses: [
        "Tenants are not legally obligated to pay brokerage if finding owners via verified direct listings",
        "If dealing through a licensed real estate broker, always demand a GST invoice and written terms beforehand"
      ]
    },
    {
      id: "legal-notice",
      topic: "Notice Period & Lock-in Clauses",
      importance: "Tenancy Rights",
      rule: "Standard 30-Day Mutual Written Notice",
      details: "A fair tenancy agreement must have reciprocal notice periods. If a tenant is required to give 30 days notice to vacate, the owner cannot legally evict the tenant with 24 or 48 hours notice without explicit lease violations.",
      keyClauses: [
        "Check for unilateral lock-in clauses (e.g., forfeiting entire 2-month deposit if tenant vacates before 6 months)",
        "Fair wear-and-tear exceptions must be explicitly stated so repainting costs aren't unfairly withheld"
      ]
    }
  ],

  governmentSchemes: [
    {
      id: "scheme-arhc",
      name: "ARHCs — Affordable Rental Housing Complexes",
      ministry: "Ministry of Housing and Urban Affairs (MoHUA), Govt of India",
      targetBeneficiaries: "Urban migrants, students, industrial labor, service workers, and relocating low-income professionals",
      overview: "Launched as a sub-scheme under the Pradhan Mantri Awas Yojana (PMAY-U) post-pandemic, ARHC converts existing vacant government-funded housing complexes into affordable rental units operated through public-private partnerships, ensuring dignified living close to industrial and urban workspaces.",
      benefits: [
        "Subsidized rental rates significantly below commercial market rates",
        "Direct water, sewerage, electricity, and internal road infrastructure guaranteed by civic bodies",
        "Standardized tenancy agreements with zero predatory deposit lock-ins"
      ],
      howToApply: "Eligible urban workers and institutions can register via their local municipal corporation portal (e.g., NMC in Nagpur, PMC in Pune) or nodal concessionaire offices."
    },
    {
      id: "scheme-pmay-u",
      name: "PMAY-Urban Rental & Dormitory Housing Framework",
      ministry: "Central & State Housing Development Boards (e.g., MHADA Maharashtra)",
      targetBeneficiaries: "Economically Weaker Sections (EWS: annual income up to ₹3L) and Lower Income Groups (LIG: ₹3L–₹6L)",
      overview: "State housing boards develop designated rental housing blocks and working women / student dormitories on civic land. For example, MHADA's mill-worker and transit rental housing initiatives offer secure leases with government-regulated rent escalations.",
      benefits: [
        "Protection from arbitrary eviction and opaque maintenance charges",
        "Reserved quotas for students, single working women, and persons with disabilities",
        "Direct integration with municipal health and transport links"
      ],
      howToApply: "Applications open periodically through the MHADA lottery portal (mhada.gov.in) and state municipal housing cell windows."
    }
  ]
};
