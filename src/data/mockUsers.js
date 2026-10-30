export const mockUsers = {
  customer: {
    id: "user-cust-01",
    role: "customer",
    name: "Aarav Sharma",
    email: "aarav.sharma@student.edu",
    phone: "+91 98222 33410",
    designation: "Relocating Renter / Final Year Scholar",
    city: "Nagpur",
    budgetRange: "₹15,000 - ₹25,000",
    preferredLocalities: ["Dharampeth", "Ramdaspeth", "Viman Nagar"],
    savedListings: ["prop-ngp-01", "prop-pune-02"]
  },
  vendor: {
    id: "user-vend-01",
    role: "vendor",
    name: "Rajesh M. Sharma",
    email: "rajesh.sharma@gmail.com",
    phone: "+91 98230 44120",
    designation: "Independent Property Owner",
    city: "Nagpur",
    kycStatus: "Aadhaar e-KYC Verified",
    ownedProperties: ["prop-ngp-01"]
  },
  admin: {
    id: "user-admin-01",
    role: "admin",
    name: "Arvind Mehta",
    email: "arvind.mehta@rentify.gov.in",
    phone: "+91 94220 11980",
    designation: "Chief Verification Registrar",
    department: "Directorate of Housing Integrity & Audit",
    jurisdiction: "Nagpur & Pune Regional Desks"
  },
  partner: {
    id: "partner-01",
    role: "partner",
    name: "Amit Patil",
    email: "amit.patil@rentify.verify.in",
    phone: "+91 98500 77123",
    designation: "Senior Field Verification Officer",
    badgeNumber: "VP-042",
    zone: "Nagpur Central & West Corridor",
    assignedCount: 2,
    completedCount: 24
  },
  partnerPune: {
    id: "partner-02",
    role: "partner",
    name: "Pooja Kulkarni",
    email: "pooja.kulkarni@rentify.verify.in",
    phone: "+91 99700 88231",
    designation: "Field Inspection Officer",
    badgeNumber: "VP-108",
    zone: "Pune Metro (Viman Nagar, Hinjewadi, Kothrud)",
    assignedCount: 1,
    completedCount: 31
  }
};

export const seededUserList = [
  mockUsers.customer,
  mockUsers.vendor,
  mockUsers.admin,
  mockUsers.partner,
  mockUsers.partnerPune,
];

export const availablePartners = [
  mockUsers.partner,
  mockUsers.partnerPune
];

/**
 * Find user by phone number (normalizing spaces, dashes, +91 prefixes)
 */
export const findUserByPhone = (inputPhone) => {
  if (!inputPhone) return null;
  // Clean input digits
  const cleanDigits = inputPhone.replace(/\D/g, '');
  // Get last 10 digits
  const target10 = cleanDigits.slice(-10);
  if (target10.length !== 10) return null;

  return seededUserList.find(u => {
    const uDigits = u.phone.replace(/\D/g, '').slice(-10);
    return uDigits === target10;
  }) || null;
};
