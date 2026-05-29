const translations = {
  ar: {
    appName: 'إلكترو سوقو',
    dashboard: 'لوحة التحكم',
    customers: 'العملاء',
    plans: 'الأقساط',
    payments: 'المدفوعات',
    settings: 'الإعدادات',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'دخول',
    register: 'إنشاء حساب',
    totalCustomers: 'إجمالي العملاء',
    totalPlans: 'إجمالي العقود',
    outstanding: 'المبالغ المستحقة',
    overdue: 'المتأخرة',
    addCustomer: 'إضافة عميل',
    addPlan: 'عقد جديد',
    name: 'الاسم',
    phone: 'الهاتف',
    address: 'العنوان',
    guarantorName: 'اسم الكفيل',
    guarantorPhone: 'هاتف الكفيل',
    guarantorAddress: 'عنوان الكفيل',
    guarantorRelation: 'صلة القرابة',
    notes: 'ملاحظات',
    currency: 'العملة',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    search: 'بحث...',
    description: 'الوصف / المنتج',
    totalAmount: 'المبلغ الإجمالي',
    downPayment: 'الدفعة الأولى',
    installmentCount: 'عدد الأقساط',
    monthlyAmount: 'القسط الشهري',
    startDate: 'تاريخ البدء',
    customer: 'العميل',
    status: 'الحالة',
    paid: 'مدفوع',
    remaining: 'المتبقي',
    recordPayment: 'تسجيل دفعة',
    amount: 'المبلغ',
    date: 'التاريخ',
    paymentNotes: 'ملاحظات الدفعة',
    schedule: 'جدول الأقساط',
    installmentNo: 'القسط #',
    dueDate: 'تاريخ الاستحقاق',
    paymentStatus: 'الحالة',
    active: 'نشط',
    completed: 'مكتمل',
    noData: 'لا توجد بيانات',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'تم بنجاح',
    confirmDelete: 'هل أنت متأكد من الحذف؟',
    back: 'رجوع',
    viewDetails: 'التفاصيل',
    interestRate: 'نسبة الفائدة %',
    interestType: 'نوع الفائدة',
    none: 'بدون فائدة',
    simple: 'بسيطة',
    compound: 'مركبة',
    penaltyRate: 'نسبة الغرامة %',
    penaltyEnabled: 'تفعيل الغرامة',
    whatsapp: 'واتساب',
    callClient: 'اتصال',
    thisMonth: 'هذا الشهر',
    totalPaid: 'إجمالي المدفوع',
    nextInstallment: 'القسط القادم',
    language: 'اللغة',
    products: 'المخزن',
    addProduct: 'مادة جديدة',
    inventory: 'الجرد',
    suppliers: 'الشركات',
    sales: 'المبيعات',
    accounting: 'المحاسبة',
    expenses: 'المصاريف',
    revenue: 'الإيرادات',
    netProfit: 'صافي الربح',
  },
}

let currentLang = 'ar'

export function setLang(lang) {
  currentLang = lang
  localStorage.setItem('lang', lang)
}

export function getLang() { return currentLang }

export function t(key) {
  return translations.ar[key] || key
}

export function formatCurrency(amount, currency = 'IQD') {
  if (!amount && amount !== 0) return '—'
  const num = parseFloat(amount)
  return currency === 'USD'
    ? `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `IQD ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
}
