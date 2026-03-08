import '../models/user.model.dart';
import '../models/listing.model.dart';
import '../models/category.model.dart';
import '../models/transaction.model.dart';
import '../models/notification.model.dart';
import '../models/subscription.model.dart';

class MockData {
  // ── AUTH ──────────────────────────────────────────────────
  // 4 test accounts — each has a unique phone and OTP
  //
  //  #  Phone          Role            OTP
  //  1  03001234567    Customer        111111
  //  2  03219876543    Local Dealer    222222
  //  3  03335551234    City Franchise  333333
  //  4  03451112233    Wholesale       444444
  //
  static final users = {
    'customer': UserModel(
      id: 'u1',
      name: 'Ali Hassan',
      nameUrdu: 'علی حسن',
      phone: '+92 300-1234567',
      email: 'ali@example.com',
      role: UserRole.customer,
      city: 'Karachi',
      kycStatus: KycStatus.approved,
      languageCode: 'ur',
      subscriptionStatus: null,
    ),
    'dealer': UserModel(
      id: 'u2',
      name: 'Bilal Traders',
      nameUrdu: 'بلال ٹریڈرز',
      phone: '+92 321-9876543',
      email: 'bilal@example.com',
      role: UserRole.localDealer,
      city: 'Karachi',
      kycStatus: KycStatus.approved,
      languageCode: 'ur',
      zone: 'Korangi Industrial Area',
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionDaysLeft: 18,
    ),
    'franchise': UserModel(
      id: 'u3',
      name: 'City Franchise Karachi',
      nameUrdu: 'سٹی فرنچائز کراچی',
      phone: '+92 333-5551234',
      email: 'franchise@example.com',
      role: UserRole.cityFranchise,
      city: 'Karachi',
      kycStatus: KycStatus.approved,
      languageCode: 'ur',
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionDaysLeft: 25,
    ),
    'wholesale': UserModel(
      id: 'u4',
      name: 'National Recyclers',
      nameUrdu: 'نیشنل ری سائیکلرز',
      phone: '+92 345-1112233',
      email: 'national@example.com',
      role: UserRole.wholesale,
      city: 'Lahore',
      kycStatus: KycStatus.approved,
      languageCode: 'en',
      zone: 'All Zones',
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionDaysLeft: 30,
    ),
  };

  // Phone → role mapping for login
  static final phoneToRole = {
    '03001234567': 'customer',
    '3001234567': 'customer',
    '+923001234567': 'customer',
    '03219876543': 'dealer',
    '3219876543': 'dealer',
    '+923219876543': 'dealer',
    '03335551234': 'franchise',
    '3335551234': 'franchise',
    '+923335551234': 'franchise',
    '03451112233': 'wholesale',
    '3451112233': 'wholesale',
    '+923451112233': 'wholesale',
  };

  // Phone → OTP mapping
  static final phoneToOtp = {
    '03001234567': '111111',
    '3001234567': '111111',
    '+923001234567': '111111',
    '03219876543': '222222',
    '3219876543': '222222',
    '+923219876543': '222222',
    '03335551234': '333333',
    '3335551234': '333333',
    '+923335551234': '333333',
    '03451112233': '444444',
    '3451112233': '444444',
    '+923451112233': '444444',
  };

  // ── CATEGORIES ────────────────────────────────────────────
  static final categories = [
    CategoryModel(
      id: 'c1',
      slug: 'metals',
      nameEn: 'Metals',
      nameUr: 'دھاتیں',
      colorHex: '#F59E0B',
      icon: '⚙️',
      subCategories: [
        SubCategoryModel(
          id: 'sc1',
          nameEn: 'Copper',
          nameUr: 'تانبا',
          colorHex: '#F59E0B',
        ),
        SubCategoryModel(
          id: 'sc2',
          nameEn: 'Iron',
          nameUr: 'لوہا',
          colorHex: '#6B7280',
        ),
        SubCategoryModel(
          id: 'sc3',
          nameEn: 'Silver',
          nameUr: 'چاندی',
          colorHex: '#9CA3AF',
        ),
      ],
    ),
    CategoryModel(
      id: 'c2',
      slug: 'plastics',
      nameEn: 'Plastics',
      nameUr: 'پلاسٹک',
      colorHex: '#3B82F6',
      icon: '🧴',
    ),
    CategoryModel(
      id: 'c3',
      slug: 'paper',
      nameEn: 'Paper & Cardboard',
      nameUr: 'کاغذ اور گتہ',
      colorHex: '#10B981',
      icon: '📦',
    ),
    CategoryModel(
      id: 'c4',
      slug: 'electronics',
      nameEn: 'Electronics',
      nameUr: 'الیکٹرانکس',
      colorHex: '#8B5CF6',
      icon: '🔌',
    ),
    CategoryModel(
      id: 'c5',
      slug: 'organic',
      nameEn: 'Organic',
      nameUr: 'نامیاتی',
      colorHex: '#EF4444',
      icon: '🦴',
    ),
    CategoryModel(
      id: 'c6',
      slug: 'furniture',
      nameEn: 'Furniture',
      nameUr: 'فرنیچر',
      colorHex: '#F97316',
      icon: '🪑',
    ),
    CategoryModel(
      id: 'c7',
      slug: 'household',
      nameEn: 'Household',
      nameUr: 'گھریلو',
      colorHex: '#06B6D4',
      icon: '🏠',
    ),
    CategoryModel(
      id: 'c8',
      slug: 'glass',
      nameEn: 'Glass',
      nameUr: 'شیشہ',
      colorHex: '#64748B',
      icon: '🪟',
    ),
  ];

  // ── LISTINGS ──────────────────────────────────────────────
  static final listings = [
    ListingModel(
      id: 'l1',
      title: 'Copper Wire Scrap',
      titleUrdu: 'تانبے کی تار کا کباڑ',
      description: '99% pure copper wire, collected from factory.',
      descUrdu: 'فیکٹری سے جمع کی گئی تانبے کی تار',
      pricePkr: 850,
      unit: 'kg',
      quantity: 200,
      categoryId: 'c1',
      categoryName: 'Metals',
      categoryNameUr: 'دھاتیں',
      sellerName: 'Ali Hassan',
      sellerPhone: '+92 300-1234567',
      city: 'Karachi',
      area: 'Korangi',
      latitude: 24.8607,
      longitude: 67.0011,
      status: ListingStatus.active,
      visibilityLevel: VisibilityLevel.local,
      images: ['https://picsum.photos/seed/copper/400/300'],
      daysAgo: 1,
      interestedCount: 2,
    ),
    ListingModel(
      id: 'l2',
      title: 'Iron Scrap Bulk',
      titleUrdu: 'لوہے کا کباڑ بڑی مقدار',
      description: 'Mixed iron scrap from demolition site, 2 truck loads.',
      descUrdu: 'توڑ پھوڑ سائٹ سے لوہے کا کباڑ',
      pricePkr: 120,
      unit: 'kg',
      quantity: 5000,
      categoryId: 'c1',
      categoryName: 'Metals',
      categoryNameUr: 'دھاتیں',
      sellerName: 'Zain Construction',
      sellerPhone: '+92 321-7654321',
      city: 'Karachi',
      area: 'SITE Industrial Area',
      latitude: 24.9056,
      longitude: 67.0215,
      status: ListingStatus.active,
      visibilityLevel: VisibilityLevel.wholesale,
      images: ['https://picsum.photos/seed/iron/400/300'],
      daysAgo: 2,
      interestedCount: 8,
    ),
    ListingModel(
      id: 'l3',
      title: 'Electronic Scrap Mix',
      titleUrdu: 'الیکٹرانک کباڑ مکس',
      description: 'Old computers, PCBs, cables from office clearance.',
      pricePkr: 300,
      unit: 'kg',
      quantity: 150,
      categoryId: 'c4',
      categoryName: 'Electronics',
      categoryNameUr: 'الیکٹرانکس',
      sellerName: 'Raza Office Solutions',
      sellerPhone: '+92 333-1122334',
      city: 'Lahore',
      area: 'Gulberg',
      latitude: 31.5204,
      longitude: 74.3587,
      status: ListingStatus.active,
      visibilityLevel: VisibilityLevel.city,
      images: ['https://picsum.photos/seed/electronics/400/300'],
      daysAgo: 5,
      interestedCount: 4,
    ),
    ListingModel(
      id: 'l4',
      title: 'Paper Waste - Office Ream',
      titleUrdu: 'دفتری ردی کاغذ',
      description: 'Clean white paper waste, well sorted. From bank branch clearance.',
      descUrdu: 'صاف سفید ردی کاغذ، اچھی ترتیب سے۔ بینک برانچ سے',
      pricePkr: 45,
      unit: 'kg',
      quantity: 800,
      categoryId: 'c3',
      categoryName: 'Paper & Cardboard',
      categoryNameUr: 'کاغذ اور گتہ',
      sellerName: 'National Bank Branch',
      sellerPhone: '+92 300-9988776',
      city: 'Islamabad',
      area: 'Blue Area',
      latitude: 33.7294,
      longitude: 73.0931,
      status: ListingStatus.active,
      visibilityLevel: VisibilityLevel.neighbor,
      images: ['https://picsum.photos/seed/paper/400/300'],
      daysAgo: 3,
      interestedCount: 1,
    ),
    ListingModel(
      id: 'l5',
      title: 'Plastic Bottles PET',
      titleUrdu: 'پی ای ٹی پلاسٹک بوتلیں',
      description: 'Crushed PET plastic bottles, ready for recycling.',
      descUrdu: 'کچلی ہوئی پی ای ٹی بوتلیں، ری سائیکلنگ کے لیے تیار',
      pricePkr: 75,
      unit: 'kg',
      quantity: 300,
      categoryId: 'c2',
      categoryName: 'Plastics',
      categoryNameUr: 'پلاسٹک',
      sellerName: 'Soft Drink Factory',
      sellerPhone: '+92 321-3344556',
      city: 'Faisalabad',
      area: 'Industrial Estate',
      latitude: 31.4504,
      longitude: 73.1350,
      status: ListingStatus.underNegotiation,
      visibilityLevel: VisibilityLevel.local,
      images: ['https://picsum.photos/seed/plastic/400/300'],
      daysAgo: 7,
      interestedCount: 6,
    ),
  ];

  // ── TRANSACTIONS ─────────────────────────────────────────
  static final transactions = [
    TransactionModel(
      id: 't1',
      listingId: 'l1',
      listingTitle: 'Copper Wire Scrap',
      buyerName: 'Bilal Traders',
      sellerName: 'Ali Hassan',
      offeredPricePkr: 820,
      finalPricePkr: 840,
      quantity: 200,
      unit: 'kg',
      status: TransactionStatus.finalized,
      totalPkr: 168000,
      createdAt: DateTime.now().subtract(Duration(days: 2)),
    ),
    TransactionModel(
      id: 't2',
      listingId: 'l3',
      listingTitle: 'Electronic Scrap Mix',
      buyerName: 'City Franchise Karachi',
      sellerName: 'Raza Office Solutions',
      offeredPricePkr: 280,
      finalPricePkr: null,
      quantity: 150,
      unit: 'kg',
      status: TransactionStatus.negotiating,
      totalPkr: 42000,
      createdAt: DateTime.now().subtract(Duration(hours: 5)),
    ),
  ];

  // ── NOTIFICATIONS ─────────────────────────────────────────
  // Criteria: zone-based (Karachi / Korangi), category-based (user's
  // listed categories: Metals, Electronics), offer/deal activity on
  // the user's own listings, subscription lifecycle, and chat messages.
  static final notifications = [
    // ── Zone-based: new listing appeared in user's zone (Karachi → Korangi)
    NotificationModel(
      id: 'n1',
      title: 'New listing in your zone',
      titleUr: 'آپ کے علاقے میں نئی فہرست',
      body: 'Copper Wire Scrap - 200kg added in Korangi',
      bodyUr: 'کوڑنگی میں تانبے کی تار کا کباڑ شامل ہوا',
      type: NotificationType.newListing,
      isRead: false,
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      data: {'listingId': 'l1'},
    ),

    // ── Offer on user's own listing
    NotificationModel(
      id: 'n2',
      title: 'Offer received',
      titleUr: 'پیشکش ملی',
      body: 'Bilal Traders offered ₨820/kg for your Copper Wire',
      bodyUr: 'بلال ٹریڈرز نے تانبے کی تار کے لیے ₨820 فی کلو پیشکش کی',
      type: NotificationType.offerReceived,
      isRead: false,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      data: {'listingId': 'l1', 'transactionId': 't1'},
    ),

    // ── Subscription lifecycle
    NotificationModel(
      id: 'n3',
      title: 'Subscription expiring',
      titleUr: 'سبسکرپشن ختم ہونے والی ہے',
      body: 'Your plan expires in 3 days. Renew now.',
      bodyUr: 'آپ کی سبسکرپشن 3 دن میں ختم ہوگی۔ ابھی تجدید کریں',
      type: NotificationType.subscriptionExpiring,
      isRead: true,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      data: {},
    ),

    // ── Category-based price alert (Metals — user's active category)
    NotificationModel(
      id: 'n4',
      title: 'Price alert: Metals ↑',
      titleUr: 'قیمت الرٹ: دھاتیں ↑',
      body: 'Iron prices in Karachi rose 12% this week — check Iron Scrap Bulk',
      bodyUr: 'کراچی میں لوہے کی قیمتیں اس ہفتے 12% بڑھ گئیں',
      type: NotificationType.priceAlert,
      isRead: false,
      createdAt: DateTime.now().subtract(const Duration(hours: 6)),
      data: {'listingId': 'l2'},
    ),

    // ── Deal finalized on user's transaction
    NotificationModel(
      id: 'n5',
      title: 'Deal finalized ✓',
      titleUr: 'ڈیل مکمل ہو گئی ✓',
      body: 'Copper Wire Scrap deal with Bilal Traders @ ₨840/kg is finalized. View bond.',
      bodyUr: 'بلال ٹریڈرز کے ساتھ تانبے کی تار کی ڈیل ₨840/کلو پر مکمل',
      type: NotificationType.dealFinalized,
      isRead: false,
      createdAt: DateTime.now().subtract(const Duration(hours: 12)),
      data: {'transactionId': 't1', 'listingId': 'l1'},
    ),

    // ── Chat message from buyer
    NotificationModel(
      id: 'n6',
      title: 'New message from Bilal Traders',
      titleUr: 'بلال ٹریڈرز کا نیا پیغام',
      body: '"I\'ll arrange pickup tomorrow morning at 9 AM."',
      bodyUr: '"کل صبح 9 بجے پک اپ کا بندوبست کروں گا"',
      type: NotificationType.chatMessage,
      isRead: true,
      createdAt: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
      data: {'chatRoomId': 'bilal-traders'},
    ),

    // ── Zone-based: new listing in neighboring zone (Karachi → SITE Area)
    NotificationModel(
      id: 'n7',
      title: 'New listing nearby',
      titleUr: 'قریب نئی فہرست',
      body: 'Iron Scrap Bulk - 5,000kg in SITE Industrial Area, Karachi',
      bodyUr: 'سائٹ انڈسٹریل ایریا میں لوہے کا بلک کباڑ',
      type: NotificationType.newListing,
      isRead: true,
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      data: {'listingId': 'l2'},
    ),

    // ── KYC approved
    NotificationModel(
      id: 'n8',
      title: 'KYC Approved ✓',
      titleUr: 'KYC منظور ✓',
      body: 'Your identity has been verified. You can now create listings.',
      bodyUr: 'آپ کی شناخت کی تصدیق ہو گئی۔ اب آپ فہرست بنا سکتے ہیں',
      type: NotificationType.kycUpdate,
      isRead: true,
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      data: {},
    ),
  ];

  // ── SUBSCRIPTION PLANS ────────────────────────────────────
  static final subscriptionPlans = [
    SubscriptionPlanModel(
      id: 'sp1',
      name: 'Local Dealer Weekly',
      nameUr: 'لوکل ڈیلر ہفتہ وار',
      role: 'local_dealer',
      priceWeekly: 500,
      priceMonthly: 1500,
      features: ['Zone listings access', 'Deal finalization', 'Digital bonds'],
      featuresUr: ['علاقے کی فہرستیں', 'ڈیل مکمل کریں', 'ڈیجیٹل بانڈ'],
    ),
    SubscriptionPlanModel(
      id: 'sp2',
      name: 'Franchise Monthly',
      nameUr: 'فرنچائز ماہانہ',
      role: 'city_franchise',
      priceWeekly: 1500,
      priceMonthly: 4500,
      features: ['Multi-zone access', 'Escalated listings', 'Analytics dashboard', 'Priority support'],
      featuresUr: ['متعدد علاقے', 'ترقی یافتہ فہرستیں', 'تجزیاتی ڈیش بورڈ', 'ترجیحی سپورٹ'],
    ),
    SubscriptionPlanModel(
      id: 'sp3',
      name: 'Wholesale Monthly',
      nameUr: 'ہول سیل ماہانہ',
      role: 'wholesale',
      priceWeekly: 4000,
      priceMonthly: 12000,
      features: ['All listings access', 'Bulk inventory view', 'Price history', 'API access'],
      featuresUr: ['تمام فہرستیں', 'بلک انوینٹری', 'قیمت کی تاریخ', 'API رسائی'],
    ),
  ];
}
