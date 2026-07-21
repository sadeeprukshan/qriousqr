import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { isMockMode } from '../supabaseClient.js';
import {
  getCompany,
  updateCompany,
  uploadImage,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  reorderProducts,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getAnalytics,
  getBranches,
  addBranch,
  updateBranch,
  deleteBranch
} from '../services/dashboardService.js';
import { loadAllergens, loadTags, createTag } from '../services/dataService.js';
import {
  getMembers,
  getInvites,
  createInvite,
  revokeInvite,
  removeMember,
  updateMemberRole,
  resendInviteEmail
} from '../services/teamService.js';
import QrTab from './dashboard/QrTab.jsx';
import OperatorConsoleTab from './dashboard/OperatorConsoleTab.jsx';
import FileInput from '../components/FileInput.jsx';
import LineChart from '../components/LineChart.jsx';
import BarChart from '../components/BarChart.jsx';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';
import QSuccessToast from '../components/QSuccessToast.jsx';

const PROFILE_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound' },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' },
  { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
  { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
  { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' }
];

const PROFILE_COUNTRIES = [
  { code: 'LB', name: 'Lebanon', emoji: '🇱🇧' },
  { code: 'AE', name: 'United Arab Emirates', emoji: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', emoji: '🇸🇦' },
  { code: 'EG', name: 'Egypt', emoji: '🇪🇬' },
  { code: 'JO', name: 'Jordan', emoji: '🇯🇴' },
  { code: 'KW', name: 'Kuwait', emoji: '🇰🇼' },
  { code: 'QA', name: 'Qatar', emoji: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', emoji: '🇧🇭' },
  { code: 'OM', name: 'Oman', emoji: '🇴🇲' },
  { code: 'IQ', name: 'Iraq', emoji: '🇮🇶' },
  { code: 'SY', name: 'Syria', emoji: '🇸🇾' },
  { code: 'YE', name: 'Yemen', emoji: '🇾🇪' },
  { code: 'PS', name: 'Palestine', emoji: '🇵🇸' },
  { code: 'MA', name: 'Morocco', emoji: '🇲🇦' },
  { code: 'TN', name: 'Tunisia', emoji: '🇹🇳' },
  { code: 'DZ', name: 'Algeria', emoji: '🇩🇿' },
  { code: 'US', name: 'United States', emoji: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', emoji: '🇬🇧' },
  { code: 'IN', name: 'India', emoji: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', emoji: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', emoji: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', emoji: '🇱🇰' },
  { code: 'TR', name: 'Turkey', emoji: '🇹🇷' },
  { code: 'FR', name: 'France', emoji: '🇫🇷' },
  { code: 'DE', name: 'Germany', emoji: '🇩🇪' },
  { code: 'AU', name: 'Australia', emoji: '🇦🇺' },
  { code: 'CA', name: 'Canada', emoji: '🇨🇦' }
];

const DAYS_MAP = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

function isValidHex(hex) {
  return /^#([A-Fa-f0-9]{3}){1,2}$/.test(hex);
}

export default function Dashboard() {
  const { 
    user, 
    signOut, 
    memberships, 
    currentCompanyId, 
    setCurrentCompanyId, 
    activeRole,
    refreshMemberships 
  } = useAuth();
  
  const navigate = useNavigate();
  const { canInstall, prompt: installPrompt } = useInstallPrompt();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Database Data States
  const [company, setCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState({ dailyVisitors: [], topProducts: [] });
  
  // Master lists
  const [allergensList, setAllergensList] = useState([]);
  const [tagsList, setTagsList] = useState([]);

  // Team tab lists
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  // DnD States
  const [draggingCatId, setDraggingCatId] = useState(null);
  const [dragOverCatId, setDragOverCatId] = useState(null);
  const [draggingProdId, setDraggingProdId] = useState(null);
  const [dragOverProdId, setDragOverProdId] = useState(null);

  // Branch management states
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return sessionStorage.getItem('qrious:selectedBranchId') || '';
  });

  // Modal branch states
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const DEFAULT_HOURS = {
    mon: { open: '09:00', close: '23:00', closed: false },
    tue: { open: '09:00', close: '23:00', closed: false },
    wed: { open: '09:00', close: '23:00', closed: false },
    thu: { open: '09:00', close: '23:00', closed: false },
    fri: { open: '09:00', close: '23:00', closed: false },
    sat: { open: '09:00', close: '23:00', closed: false },
    sun: { open: '09:00', close: '23:00', closed: false }
  };

  const [branchForm, setBranchForm] = useState({
    name_en: '', name_ar: '', slug: '',
    address_en: '', address_ar: '',
    phone: '', whatsapp: '', google_map: '', cover_url: '',
    hours: DEFAULT_HOURS, is_active: true, is_default: false,
    sort_order: 0
  });
  const [branchCoverFile, setBranchCoverFile] = useState(null);
  const [branchCoverPreview, setBranchCoverPreview] = useState('');

  // Branch delete confirmation modal states
  const [showDeleteBranchModal, setShowDeleteBranchModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [deleteBranchConfirmName, setDeleteBranchConfirmName] = useState('');

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const isAnyUploading = uploadingCount > 0;

  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [branchCoverUploading, setBranchCoverUploading] = useState(false);
  const [catImageUploading, setCatImageUploading] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);

  const [alert, setAlert] = useState({ type: '', message: '' });
  const [successToast, setSuccessToast] = useState({ message: '', visible: false });
  
  // Tab: Profile Form States
  const [profileForm, setProfileForm] = useState({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    theme_color: '#FF5722', secondary_color: '#0E7C7B', text_color: '#14110F', background_color: '#FAF8F5',
    whatsapp: '', phone: '', google_map: '', instagram: '', snapchat: '', twitter: '',
    currency_code: 'USD', country_code: 'US'
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  const [colorInputs, setColorInputs] = useState({
    theme_color: '#FF5722',
    secondary_color: '#0E7C7B',
    text_color: '#14110F',
    background_color: '#FAF8F5'
  });

  // Tab: Menu - Category States
  const [selectedCatId, setSelectedCatId] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [catForm, setCatForm] = useState({ name_en: '', name_ar: '', image_url: '' });
  const [catImageFile, setCatImageFile] = useState(null);
  const [catImagePreview, setCatImagePreview] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Category Delete Confirmation Modal
  const [showDeleteCatModal, setShowDeleteCatModal] = useState(false);
  const [catToDelete, setCatToDelete] = useState(null);
  const [deleteCatConfirmName, setDeleteCatConfirmName] = useState('');

  // Tab: Menu - Product States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name_en: '', name_ar: '', description_en: '', description_ar: '',
    price: '', calories: '', is_available: true, image_url: '',
    category_id: '', tags: [], allergens: [], coupon_category: ''
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState('');

  // Product Popover dropdown lists
  const [showAllergensDropdown, setShowAllergensDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  
  // Custom tag creation inline states
  const [newTagForm, setNewTagForm] = useState({ name_en: '', name_ar: '', color: '#0E7C7B' });
  const [creatingCustomTag, setCreatingCustomTag] = useState(false);

  const [analyticsRange, setAnalyticsRange] = useState(7);
  const [analyticsBranchId, setAnalyticsBranchId] = useState('all');

  // Load Coupon stats for company
  const [couponStats, setCouponStats] = useState(null);

  useEffect(() => {
    if (!company) return;
    async function loadCouponStats() {
      try {
        if (isMockMode) {
          const allCoupons = JSON.parse(localStorage.getItem('qriousqr:mock_coupons') || '[]');
          const companyCoupons = allCoupons.filter(c => c.company_slug === company.slug);
          
          const issued = companyCoupons.length;
          const used = companyCoupons.filter(c => c.status === 'used').length;
          const expired = companyCoupons.filter(c => c.status === 'expired').length;
          const active = companyCoupons.filter(c => c.status === 'available').length;

          const mainTotal = companyCoupons.filter(c => c.category === 'main_course').length;
          const mainUsed = companyCoupons.filter(c => c.category === 'main_course' && c.status === 'used').length;

          const dessertTotal = companyCoupons.filter(c => c.category === 'dessert').length;
          const dessertUsed = companyCoupons.filter(c => c.category === 'dessert' && c.status === 'used').length;

          const beverageTotal = companyCoupons.filter(c => c.category === 'beverage').length;
          const beverageUsed = companyCoupons.filter(c => c.category === 'beverage' && c.status === 'used').length;

          setCouponStats({
            issued,
            used,
            expired,
            active,
            category_breakdown: {
              main_course: { used: mainUsed, total: mainTotal },
              dessert: { used: dessertUsed, total: dessertTotal },
              beverage: { used: beverageUsed, total: beverageTotal }
            }
          });
        } else {
          const { data, error } = await supabase.rpc('coupon_stats_for_company', {
            p_company_id: company.id,
            p_days: 30
          });
          if (!error && data && data.length > 0) {
            setCouponStats(data[0]);
          } else {
            setCouponStats(null);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (activeTab === 'analytics') {
      loadCouponStats();
    }
  }, [company, activeTab]);

  const [revealMerchantPin, setRevealMerchantPin] = useState(false);
  const [copiedMerchantPin, setCopiedMerchantPin] = useState(false);

  useEffect(() => {
    if (!revealMerchantPin) return;
    const timer = setTimeout(() => {
      setRevealMerchantPin(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [revealMerchantPin]);

  const isStaff = activeRole === 'staff';
  const isSuspended = company && company.status === 'suspended';
  const isLocked = isStaff || isSuspended;

  // Load dashboard data when currentCompanyId changes
  useEffect(() => {
    if (!user) return;
    if (memberships.length === 0) {
      setLoading(false);
      return;
    }
    if (!currentCompanyId) return;
    loadDashboardData();
  }, [user, currentCompanyId, memberships]);

  // Load scoped branch categories & products when branchId changes
  useEffect(() => {
    if (!company || !selectedBranchId) return;
    
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cats = await getCategories(company.id, company.slug, selectedBranchId);
        if (cancelled) return;
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCatId(cats[0].id);
        } else {
          setSelectedCatId('');
        }

        const prods = await getProducts(company.id, company.slug, selectedBranchId);
        if (cancelled) return;
        setProducts(prods);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedBranchId, company]);

  // Load scoped branch analytics when range or branchId changes
  useEffect(() => {
    if (!company) return;
    (async () => {
      try {
        const analyticsData = await getAnalytics(company.id, company.slug, analyticsBranchId, String(analyticsRange));
        setAnalytics(analyticsData);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [analyticsBranchId, analyticsRange, company]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const activeComp = memberships.find(m => m.id === currentCompanyId);
      const slug = activeComp?.slug || 'kantami';
      const comp = await getCompany(user.id, slug);
      if (comp) {
        setCompany(comp);
        const formValues = {
          name_en: comp.name_en || '',
          name_ar: comp.name_ar || '',
          description_en: comp.description_en || '',
          description_ar: comp.description_ar || '',
          theme_color: comp.theme_color || '#FF5722',
          secondary_color: comp.secondary_color || '#0E7C7B',
          text_color: comp.text_color || '#14110F',
          background_color: comp.background_color || '#FAF8F5',
          whatsapp: comp.whatsapp || '',
          phone: comp.phone || '',
          google_map: comp.google_map || '',
          instagram: comp.instagram || '',
          snapchat: comp.snapchat || '',
          twitter: comp.twitter || '',
          currency_code: comp.currency_code || 'USD',
          country_code: comp.country_code || 'US'
        };
        setProfileForm(formValues);
        setLogoPreview(comp.logo_url || '');
        setCoverPreview(comp.cover_url || '');
        
        setColorInputs({
          theme_color: formValues.theme_color,
          secondary_color: formValues.secondary_color,
          text_color: formValues.text_color,
          background_color: formValues.background_color
        });
        
        // Load branches
        const branchesList = await getBranches(comp.id, comp.slug);
        setBranches(branchesList);

        let initialBranchId = selectedBranchId;
        if (!initialBranchId || !branchesList.some(b => b.id === initialBranchId)) {
          const defaultBranch = branchesList.find(b => b.is_default) || branchesList[0];
          initialBranchId = defaultBranch ? defaultBranch.id : '';
          setSelectedBranchId(initialBranchId);
          sessionStorage.setItem('qrious:selectedBranchId', initialBranchId);
        }

        if (initialBranchId) {
          const cats = await getCategories(comp.id, comp.slug, initialBranchId);
          setCategories(cats);
          if (cats.length > 0) {
            setSelectedCatId(cats[0].id);
          }

          const prods = await getProducts(comp.id, comp.slug, initialBranchId);
          setProducts(prods);
        }

        const analyticsData = await getAnalytics(comp.id, comp.slug, analyticsBranchId, String(analyticsRange));
        setAnalytics(analyticsData);

        // Load master lists
        const allergens = await loadAllergens();
        setAllergensList(allergens);
        
        const tags = await loadTags(comp.id);
        setTagsList(tags);

        // Load team members and invites
        const teamMembers = await getMembers(comp.id);
        setMembers(teamMembers);

        const pendingInvites = await getInvites(comp.id);
        setInvites(pendingInvites);
      }
    } catch (e) {
      console.error(e);
      showAlert('error', 'Failed to load dashboard details.');
    } finally {
      setLoading(false);
    }
  }

  const showAlert = (type, message) => {
    if (type === 'success') {
      setSuccessToast({ message, visible: true });
      return;
    }
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 4500);
  };

  // Auto-generate branch slug from name_en
  useEffect(() => {
    if (!showBranchModal || editingBranch) return;
    const cleanSlug = branchForm.name_en
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setBranchForm(prev => ({ ...prev, slug: cleanSlug }));
  }, [branchForm.name_en, showBranchModal, editingBranch]);

  // Company Switcher selection handler
  const handleCompanySwitch = (e) => {
    setCurrentCompanyId(e.target.value);
    setActiveTab('profile'); // reset tab on switch
  };

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  // Labeled color text input bindings
  const handleColorPickerChange = (name, value) => {
    setProfileForm(prev => ({ ...prev, [name]: value }));
    setColorInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleColorTextChange = (name, value) => {
    setColorInputs(prev => ({ ...prev, [name]: value }));
    if (isValidHex(value)) {
      setProfileForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Country select changes with auto-suggest currency
  const handleCountryChange = (e) => {
    const code = e.target.value;
    const suggestions = {
      LB: 'USD', AE: 'AED', SA: 'SAR', EG: 'EGP', JO: 'JOD', KW: 'KWD', QA: 'QAR', BH: 'BHD', OM: 'OMR', IQ: 'IQD',
      MA: 'MAD', TN: 'TND', DZ: 'DZD', US: 'USD', GB: 'GBP', IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', TR: 'TRY',
      FR: 'EUR', DE: 'EUR', AU: 'AUD', CA: 'CAD'
    };
    
    setProfileForm(prev => ({
      ...prev,
      country_code: code,
      currency_code: suggestions[code] || prev.currency_code
    }));
  };

  const handleImageChange = async (file, type) => {
    if (isStaff) return;
    if (!file) return;

    if (isAnyUploading) {
      showAlert('warning', 'Another upload is still in progress. Please wait.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    if (type === 'logo') {
      setLogoPreview(localUrl);
      setLogoUploading(true);
    }
    if (type === 'cover') {
      setCoverPreview(localUrl);
      setCoverUploading(true);
    }

    setUploadingCount(n => n + 1);
    try {
      const bucket = type === 'logo' ? 'logos' : 'covers';
      const publicUrl = await uploadImage(bucket, file, user.id);
      setProfileForm(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'cover_url']: publicUrl
      }));
      showAlert('success', `${type === 'logo' ? 'Logo' : 'Cover'} uploaded successfully.`);
    } catch (err) {
      console.error(err);
      if (type === 'logo') setLogoPreview(profileForm.logo_url || '');
      if (type === 'cover') setCoverPreview(profileForm.cover_url || '');
      showAlert('error', 'Upload failed. The image was not saved.');
    } finally {
      if (type === 'logo') setLogoUploading(false);
      if (type === 'cover') setCoverUploading(false);
      setUploadingCount(n => Math.max(0, n - 1));
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isStaff) return;
    setSaveLoading(true);
    try {
      const colors = ['theme_color', 'secondary_color', 'text_color', 'background_color'];
      const invalid = colors.find(c => !isValidHex(profileForm[c]));
      if (invalid) {
        throw new Error(`Invalid hex format in ${invalid.replace('_', ' ')}.`);
      }

      // Never persist blob: / data: URLs — those are browser-only preview URLs.
      // If the upload didn't produce a real Storage URL, keep the previous DB value.
      const isRealUrl = (u) =>
        typeof u === 'string' && u.length > 0 &&
        !u.startsWith('blob:') && !u.startsWith('data:');
      const safeLogoUrl  = isRealUrl(profileForm.logo_url)  ? profileForm.logo_url  : company.logo_url;
      const safeCoverUrl = isRealUrl(profileForm.cover_url) ? profileForm.cover_url : company.cover_url;

      const updated = await updateCompany(company.slug, {
        ...profileForm,
        logo_url: safeLogoUrl,
        cover_url: safeCoverUrl
      });
      setCompany(updated);
      setProfileForm(prev => ({
        ...prev,
        phone: updated.phone || '',
        whatsapp: updated.whatsapp || '',
        instagram: updated.instagram || '',
        snapchat: updated.snapchat || '',
        twitter: updated.twitter || ''
      }));
      showAlert('success', 'Profile updated and contacts normalized.');
    } catch (err) {
      console.error(err);
      showAlert('error', err.message || 'Failed to update profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  // BRANCHES LOGIC
  const openBranchForm = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        name_en: branch.name_en,
        name_ar: branch.name_ar,
        slug: branch.slug,
        address_en: branch.address_en || '',
        address_ar: branch.address_ar || '',
        phone: branch.phone || '',
        whatsapp: branch.whatsapp || '',
        google_map: branch.google_map || '',
        cover_url: branch.cover_url || '',
        hours: branch.hours || DEFAULT_HOURS,
        is_active: branch.is_active ?? true,
        is_default: branch.is_default ?? false,
        sort_order: branch.sort_order || 0
      });
      setBranchCoverPreview(branch.cover_url || '');
    } else {
      setEditingBranch(null);
      setBranchForm({
        name_en: '', name_ar: '', slug: '',
        address_en: '', address_ar: '',
        phone: '', whatsapp: '', google_map: '', cover_url: '',
        hours: DEFAULT_HOURS, is_active: true, is_default: false,
        sort_order: branches.length
      });
      setBranchCoverPreview('');
    }
    setBranchCoverFile(null);
    setShowBranchModal(true);
  };

  const handleBranchHoursChange = (day, field, value) => {
    setBranchForm(prev => {
      const updatedDay = { ...prev.hours[day], [field]: value };
      return {
        ...prev,
        hours: {
          ...prev.hours,
          [day]: updatedDay
        }
      };
    });
  };

  const handleBranchCoverChange = async (file) => {
    if (isStaff) return;
    if (!file) return;

    if (isAnyUploading) {
      showAlert('warning', 'Another upload is still in progress. Please wait.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setBranchCoverPreview(localUrl);
    setBranchCoverUploading(true);

    setUploadingCount(n => n + 1);
    try {
      const publicUrl = await uploadImage('branch-covers', file, user.id);
      setBranchForm(prev => ({
        ...prev,
        cover_url: publicUrl
      }));
      showAlert('success', 'Branch cover image uploaded successfully.');
    } catch (err) {
      console.error(err);
      setBranchCoverPreview(branchForm.cover_url || '');
      showAlert('error', 'Upload failed. The image was not saved.');
    } finally {
      setBranchCoverUploading(false);
      setUploadingCount(n => Math.max(0, n - 1));
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    if (isStaff) return;
    if (!branchForm.name_en || !branchForm.name_ar || !branchForm.slug) return;

    setSaveLoading(true);
    try {
      const bData = {
        ...branchForm
      };

      if (editingBranch) {
        const updated = await updateBranch(company.id, company.slug, editingBranch.id, bData);
        setBranches(branches.map(b => b.id === editingBranch.id ? updated : b));
        showAlert('success', 'Branch updated.');
      } else {
        const added = await addBranch(company.id, company.slug, bData);
        setBranches([...branches, added]);
        showAlert('success', 'Branch added.');
      }
      setShowBranchModal(false);
      
      // Refresh list to keep default indicator atomicity correct
      const freshList = await getBranches(company.id, company.slug);
      setBranches(freshList);
    } catch (err) {
      console.error(err);
      showAlert('error', err.message || 'Failed to save branch.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSetDefaultBranch = async (id) => {
    if (isStaff) return;
    try {
      await updateBranch(company.id, company.slug, id, { is_default: true });
      const freshList = await getBranches(company.id, company.slug);
      setBranches(freshList);
      showAlert('success', 'Default branch updated.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to set default branch.');
    }
  };

  const handleToggleBranchActive = async (branch) => {
    if (isStaff) return;
    try {
      const nextStatus = !branch.is_active;
      const updated = await updateBranch(company.id, company.slug, branch.id, { is_active: nextStatus });
      setBranches(branches.map(b => b.id === branch.id ? updated : b));
      showAlert('success', `Branch is now ${nextStatus ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to update branch status.');
    }
  };

  const confirmDeleteBranch = (branch) => {
    if (isStaff) return;
    if (branches.length <= 1) {
      showAlert('error', 'You must have at least one branch.');
      return;
    }
    setBranchToDelete(branch);
    setDeleteBranchConfirmName('');
    setShowDeleteBranchModal(true);
  };

  const executeDeleteBranch = async () => {
    if (isStaff || !branchToDelete) return;
    if (deleteBranchConfirmName !== branchToDelete.name_en) {
      showAlert('error', 'Branch name verification failed.');
      return;
    }

    try {
      await deleteBranch(company.id, company.slug, branchToDelete.id);
      setBranches(branches.filter(b => b.id !== branchToDelete.id));
      
      // Re-route if the deleted branch was selected in Menu
      if (selectedBranchId === branchToDelete.id) {
        const remaining = branches.filter(b => b.id !== branchToDelete.id);
        const nextBranch = remaining.find(b => b.is_default) || remaining[0];
        const nextId = nextBranch ? nextBranch.id : '';
        setSelectedBranchId(nextId);
        sessionStorage.setItem('qrious:selectedBranchId', nextId);
      }
      
      setShowDeleteBranchModal(false);
      setBranchToDelete(null);
      showAlert('success', 'Branch deleted and scoped categories/products purged.');
    } catch (err) {
      console.error(err);
      showAlert('error', err.message || 'Failed to delete branch.');
    }
  };

  // CATEGORIES PANEL LOGIC
  const handleCatImageChange = async (file) => {
    if (isStaff) return;
    if (!file) return;

    if (isAnyUploading) {
      showAlert('warning', 'Another upload is still in progress. Please wait.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setCatImagePreview(localUrl);
    setCatImageUploading(true);

    setUploadingCount(n => n + 1);
    try {
      const publicUrl = await uploadImage('category-images', file, user.id);
      setCatForm(prev => ({
        ...prev,
        image_url: publicUrl
      }));
      showAlert('success', 'Category image uploaded successfully.');
    } catch (err) {
      console.error(err);
      setCatImagePreview(catForm.image_url || '');
      showAlert('error', 'Upload failed. The image was not saved.');
    } finally {
      setCatImageUploading(false);
      setUploadingCount(n => Math.max(0, n - 1));
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleAddCatSubmit = async (e) => {
    e.preventDefault();
    if (isStaff) return;
    if (!catForm.name_en || !catForm.name_ar || !selectedBranchId) return;
    try {
      const sortOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 1;
      const newCat = await addCategory(company.id, company.slug, catForm.name_en, catForm.name_ar, sortOrder, catForm.image_url || null, selectedBranchId);
      setCategories([...categories, newCat]);
      setSelectedCatId(newCat.id);
      setCatForm({ name_en: '', name_ar: '', image_url: '' });
      setCatImageFile(null);
      setCatImagePreview('');
      setShowAddCat(false);
      showAlert('success', 'Category added.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to add category.');
    }
  };

  const handleUpdateCatSubmit = async (id) => {
    if (isStaff) return;
    if (!catForm.name_en || !catForm.name_ar) return;
    try {
      const updated = await updateCategory(company.id, company.slug, id, catForm.name_en, catForm.name_ar, catForm.image_url || null);
      setCategories(categories.map(c => c.id === id ? updated : c));
      setEditingCatId(null);
      setCatForm({ name_en: '', name_ar: '', image_url: '' });
      setCatImageFile(null);
      setCatImagePreview('');
      showAlert('success', 'Category updated.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to update category.');
    }
  };

  // Safe category deletion modal trigger
  const confirmDeleteCategory = (cat) => {
    if (isStaff) return;
    setCatToDelete(cat);
    setDeleteCatConfirmName('');
    setShowDeleteCatModal(true);
  };

  const executeDeleteCategory = async () => {
    if (isStaff || !catToDelete) return;
    const expectedName = catToDelete.name_en;
    if (deleteCatConfirmName !== expectedName) {
      showAlert('error', 'Category name verification failed.');
      return;
    }
    
    try {
      await deleteCategory(company.id, company.slug, catToDelete.id);
      const remaining = categories.filter(c => c.id !== catToDelete.id);
      setCategories(remaining);
      setProducts(products.filter(p => p.category_id !== catToDelete.id));
      if (selectedCatId === catToDelete.id && remaining.length > 0) {
        setSelectedCatId(remaining[0].id);
      }
      setShowDeleteCatModal(false);
      setCatToDelete(null);
      showAlert('success', 'Category deleted.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to delete category.');
    }
  };

  const handleCategoryReorder = async (fromId, toId) => {
    if (isStaff) return;
    if (fromId === toId) return;

    const fromIndex = categories.findIndex(c => c.id === fromId);
    const toIndex = categories.findIndex(c => c.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newCats = [...categories];
    // Remove the dragged category
    const [dragged] = newCats.splice(fromIndex, 1);
    // Insert it before the target category
    newCats.splice(toIndex, 0, dragged);

    // Map new sort_order (1-based index)
    const updatedCats = newCats.map((cat, idx) => ({
      ...cat,
      sort_order: idx + 1
    }));

    setCategories(updatedCats);
    try {
      await reorderCategories(company.id, company.slug, updatedCats);
    } catch (e) {
      console.error(e);
      showAlert('error', 'Failed to save category order.');
    }
  };

  const handleProductReorder = async (fromId, toId) => {
    if (isStaff) return;
    if (fromId === toId) return;

    const fromIndex = products.findIndex(p => p.id === fromId);
    const toIndex = products.findIndex(p => p.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newProds = [...products];
    const [dragged] = newProds.splice(fromIndex, 1);
    newProds.splice(toIndex, 0, dragged);

    // Assign sort_order = index
    const updatedProds = newProds.map((prod, idx) => ({
      ...prod,
      sort_order: idx
    }));

    setProducts(updatedProds);
    try {
      const orderedIds = updatedProds.map(p => p.id);
      await reorderProducts(company.id, company.slug, selectedCatId, orderedIds);
    } catch (e) {
      console.error(e);
      showAlert('error', 'Failed to save product order.');
    }
  };

  // PRODUCTS PANEL LOGIC
  const openProductForm = (prod = null, viewOnly = false) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        name_en: prod.name_en,
        name_ar: prod.name_ar,
        description_en: prod.description_en || '',
        description_ar: prod.description_ar || '',
        price: prod.price,
        calories: prod.calories || '',
        is_available: prod.is_available ?? true,
        image_url: prod.image_url || '',
        category_id: prod.category_id,
        tags: prod.tags || [],
        allergens: prod.allergens || [],
        coupon_category: prod.coupon_category || ''
      });
      setProductImagePreview(prod.image_url || '');
    } else {
      setEditingProduct(null);
      setProductForm({
        name_en: '',
        name_ar: '',
        description_en: '',
        description_ar: '',
        price: '',
        calories: '',
        is_available: true,
        image_url: '',
        category_id: selectedCatId,
        tags: [],
        allergens: [],
        coupon_category: ''
      });
      setProductImagePreview('');
    }
    setProductImageFile(null);
    setShowAllergensDropdown(false);
    setShowTagsDropdown(false);
    setShowProductModal(true);
  };

  const handleProductImageChange = async (file) => {
    if (isStaff) return;
    if (!file) return;

    if (isAnyUploading) {
      showAlert('warning', 'Another upload is still in progress. Please wait.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setProductImagePreview(localUrl);
    setProductImageUploading(true);

    setUploadingCount(n => n + 1);
    try {
      const publicUrl = await uploadImage('products', file, user.id);
      setProductForm(prev => ({
        ...prev,
        image_url: publicUrl
      }));
      showAlert('success', 'Product image uploaded successfully.');
    } catch (err) {
      console.error(err);
      setProductImagePreview(productForm.image_url || '');
      showAlert('error', 'Upload failed. The image was not saved.');
    } finally {
      setProductImageUploading(false);
      setUploadingCount(n => Math.max(0, n - 1));
      URL.revokeObjectURL(localUrl);
    }
  };

  // Duplicate Product Inline Action
  const handleDuplicateProduct = async (e, p) => {
    e.stopPropagation();
    if (isStaff) return;
    setLoading(true);
    try {
      const duplicatedData = {
        branch_id: selectedBranchId,
        category_id: p.category_id,
        name_en: `${p.name_en} (Copy)`,
        name_ar: `${p.name_ar} (نسخة)`,
        description_en: p.description_en,
        description_ar: p.description_ar,
        price: p.price,
        calories: p.calories,
        is_available: p.is_available,
        image_url: p.image_url,
        tags: p.tags || [],
        allergens: p.allergens || [],
        coupon_category: p.coupon_category || null
      };

      const added = await addProduct(company.id, company.slug, duplicatedData);
      setProducts([...products, added]);
      showAlert('success', 'Product duplicated successfully.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to duplicate product.');
    } finally {
      setLoading(false);
    }
  };

  // Inline Availability Toggle
  const handleToggleAvailability = async (e, p) => {
    e.stopPropagation();
    if (isStaff) return;
    try {
      const nextStatus = !p.is_available;
      const updated = await updateProduct(company.id, company.slug, p.id, { is_available: nextStatus });
      setProducts(products.map(item => item.id === p.id ? updated : item));
      showAlert('success', `Product is now ${nextStatus ? 'Available' : 'Sold Out'}.`);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to toggle availability.');
    }
  };

  // Allergens Checklist selection toggle
  const handleAllergenToggle = (slug) => {
    setProductForm(prev => {
      const exists = prev.allergens.includes(slug);
      const next = exists 
        ? prev.allergens.filter(a => a !== slug)
        : [...prev.allergens, slug];
      return { ...prev, allergens: next };
    });
  };

  // Tags Checklist selection toggle
  const handleTagToggle = (slug) => {
    setProductForm(prev => {
      const exists = prev.tags.includes(slug);
      const next = exists 
        ? prev.tags.filter(t => t !== slug)
        : [...prev.tags, slug];
      return { ...prev, tags: next };
    });
  };

  // Create Custom Tag Inline
  const handleCreateCustomTag = async (e) => {
    e.preventDefault();
    if (isStaff) return;
    if (!newTagForm.name_en || !newTagForm.name_ar) return;
    
    setCreatingCustomTag(true);
    try {
      const slug = newTagForm.name_en.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      const addedTag = await createTag(company.id, slug, newTagForm.name_en, newTagForm.name_ar, newTagForm.color);
      setTagsList([...tagsList, addedTag]);
      setProductForm(prev => ({
        ...prev,
        tags: [...prev.tags, addedTag.slug]
      }));

      setNewTagForm({ name_en: '', name_ar: '', color: '#0E7C7B' });
      showAlert('success', 'Custom tag created.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to create tag.');
    } finally {
      setCreatingCustomTag(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (isStaff) return;
    if (!productForm.name_en || !productForm.name_ar || !productForm.price || !selectedBranchId) return;
    
    setSaveLoading(true);
    try {
      const pData = {
        branch_id: selectedBranchId,
        category_id: productForm.category_id,
        name_en: productForm.name_en,
        name_ar: productForm.name_ar,
        description_en: productForm.description_en,
        description_ar: productForm.description_ar,
        price: parseFloat(productForm.price),
        calories: productForm.calories ? parseInt(productForm.calories) : null,
        is_available: productForm.is_available,
        image_url: productForm.image_url || null,
        tags: productForm.tags,
        allergens: productForm.allergens,
        coupon_category: productForm.coupon_category && productForm.coupon_category !== '' ? productForm.coupon_category : null
      };

      if (editingProduct) {
        const updated = await updateProduct(company.id, company.slug, editingProduct.id, pData);
        setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
        showAlert('success', 'Product updated.');
      } else {
        const added = await addProduct(company.id, company.slug, pData);
        setProducts([...products, added]);
        showAlert('success', 'Product added.');
      }
      setShowProductModal(false);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to save product.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (isStaff) return;
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(company.id, company.slug, id);
      setProducts(products.filter(p => p.id !== id));
      showAlert('success', 'Product deleted.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to delete product.');
    }
  };

  // TEAM TAB LOGIC
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (isStaff) return;
    if (!inviteEmail) return;
    
    setSaveLoading(true);
    try {
      const cleanEmail = inviteEmail.toLowerCase().trim();
      const newInv = await createInvite(company.id, cleanEmail, inviteRole, user.id);
      setInvites([...invites, newInv]);
      
      const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
      const inviteLink = `${baseUrl}/invite/${newInv.token}`;
      setGeneratedInviteLink(inviteLink);
      
      setInviteEmail('');
      if (newInv.__email_outcome === 'manual_share_required') {
        showAlert('info', `${cleanEmail} already has a QriousQR account. Share this invite link with them.`);
      } else if (newInv.__email_outcome === 'failed') {
        showAlert('warning', "Invite created, but the email couldn't be sent. Share the link manually.");
      } else {
        showAlert('success', `Invite email sent to ${cleanEmail}.`);
      }
    } catch (err) {
      console.error(err);
      showAlert('error', err.message || 'Failed to create invite.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (isStaff) return;
    if (!window.confirm('Revoke this pending invitation?')) return;
    try {
      await revokeInvite(company.id, inviteId);
      setInvites(invites.filter(i => i.id !== inviteId));
      showAlert('success', 'Invite revoked.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to revoke invite.');
    }
  };

  const handleResendInvite = async (inviteToken) => {
    if (isStaff) return;
    try {
      const result = await resendInviteEmail(inviteToken);
      if (result.outcome === 'sent') {
        showAlert('success', 'Invite email resent.');
      } else if (result.outcome === 'manual_share_required') {
        showAlert('info', 'User already has an account. Share the link manually: ' + (result.invite_url || ''));
      } else {
        showAlert('warning', 'Failed to send email. Share the link manually: ' + (result.invite_url || ''));
      }
    } catch (err) {
      console.error(err);
      showAlert('error', err.message || 'Failed to resend invite email.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (isStaff) return;
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await removeMember(company.id, memberId);
      setMembers(members.filter(m => m.id !== memberId && m.user_id !== memberId));
      showAlert('success', 'Team member removed.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to remove member.');
    }
  };

  const handleChangeRole = async (memberId, nextRole) => {
    if (isStaff) return;
    try {
      const updated = await updateMemberRole(company.id, memberId, nextRole);
      setMembers(members.map(m => (m.id === memberId || m.user_id === memberId) ? { ...m, role: updated.role } : m));
      showAlert('success', 'Role updated successfully.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to update member role.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <h3>Loading your Dashboard...</h3>
      </div>
    );
  }

  const filteredProducts = products.filter(p => p.category_id === selectedCatId);
  const activeCategory = categories.find(c => c.id === selectedCatId);

  const lastNDaysVisitors = analytics.dailyVisitors.slice(-analyticsRange);
  const maxVisitorCount = Math.max(...lastNDaysVisitors.map(v => v.count), 1);
  const currencySymbol = company?.currency_code || 'USD';

  // Get active company name and details from membership list
  const currentMembership = memberships.find(m => m.id === currentCompanyId);

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h2v2H7z" />
              <path d="M7 15h2v2H7z" />
              <path d="M15 7h2v2h-2z" />
              <path d="M15 15h2v2h-2z" />
            </svg>
            <span>QRious Admin</span>
          </div>
          <button className="btn-toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Multi-company Switcher top select */}
        {memberships.length > 0 && (
          <div className="sidebar-switcher-box">
            {memberships.length > 1 ? (
              <div className="company-select-wrapper">
                <select 
                  className="sidebar-company-select"
                  value={currentCompanyId}
                  onChange={handleCompanySwitch}
                >
                  {memberships.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name_en} ({m.role})
                    </option>
                  ))}
                </select>
                <div className="select-arrow-indicator">▼</div>
              </div>
            ) : (
              <div className="single-company-badge">
                <span className="co-name">{currentMembership?.name_en}</span>
                <span className={`role-badge ${activeRole}`}>{activeRole}</span>
              </div>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile settings</span>
          </button>

          {/* BRANCHES TAB SIDEBAR ITEM */}
          <button 
            className={`nav-item ${activeTab === 'branches' ? 'active' : ''}`}
            onClick={() => setActiveTab('branches')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Branches</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span>Menu management</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'operator' ? 'active' : ''}`}
            onClick={() => setActiveTab('operator')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 17H5a2 2 0 0 1-2-2V5" />
              <path d="m21 11-4 4-4-4" />
              <path d="M17 5v10" />
            </svg>
            <span>Operator</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M16 16h2v2h-2zm2 2h2v2h-2zm-2 2h2v-2" />
            </svg>
            <span>QR Code</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Analytics</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Team</span>
          </button>
          
          <div className="sidebar-divider"></div>

          <a 
            href={`/menu/${company?.slug}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-item preview-link"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>Preview Menu</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="tenant-slug">/{company?.slug} ({activeRole})</span>
          </div>
          <button className="btn-signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="dashboard-content">
        {/* Top Floating Alert */}
        {alert.message && (
          <div className={`dashboard-alert ${alert.type}`}>
            {alert.message}
          </div>
        )}

        <QSuccessToast
          message={successToast.message}
          visible={successToast.visible}
          onDismiss={() => setSuccessToast({ message: '', visible: false })}
        />



        <header className="content-header">
          <button className="sidebar-mobile-toggle" onClick={() => setSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1>
            {activeTab === 'qr' ? 'QR Code' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
            {isStaff && <span className="read-only-header-badge">View Only</span>}
          </h1>
        </header>

        <div className="tab-pane-container">
          {/* PROFILE SETTINGS TAB */}
          {activeTab === 'profile' && (
            <div className="profile-grid">
              <div className="profile-form-container">
                <form onSubmit={handleSaveProfile} className="settings-form">
                  <fieldset disabled={isStaff} style={{ border: 'none', padding: 0, margin: 0 }}>
                    {canInstall && (
                      <div style={{
                        backgroundColor: 'rgba(255, 87, 34, 0.06)',
                        border: '1px solid rgba(255, 87, 34, 0.15)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>📲</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
                              Your menu is installable
                            </span>
                            <span style={{ fontSize: '12.5px', color: 'var(--text-soft)' }}>
                              Customers can add it directly to their home screen as a standalone app.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={installPrompt}
                          style={{
                            background: 'var(--primary-color)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.15s'
                          }}
                          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                          onMouseOut={e => e.currentTarget.style.transform = 'none'}
                        >
                          Preview install prompt →
                        </button>
                      </div>
                    )}
                    <div className="settings-card">
                      <h3>Restaurant Profile</h3>
                      <div className="form-row">
                        <div className="form-group half">
                          <label>Restaurant Name (English)</label>
                          <input 
                            type="text" 
                            name="name_en" 
                            value={profileForm.name_en} 
                            onChange={handleProfileChange} 
                            required 
                          />
                        </div>
                        <div className="form-group half">
                          <label>Restaurant Name (Arabic)</label>
                          <input 
                            type="text" 
                            name="name_ar" 
                            value={profileForm.name_ar} 
                            onChange={handleProfileChange} 
                            dir="rtl"
                            required 
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group half">
                          <label>Description (English)</label>
                          <textarea 
                            name="description_en" 
                            value={profileForm.description_en} 
                            onChange={handleProfileChange} 
                            rows="3"
                          />
                        </div>
                        <div className="form-group half">
                          <label>Description (Arabic)</label>
                          <textarea 
                            name="description_ar" 
                            value={profileForm.description_ar} 
                            onChange={handleProfileChange} 
                            rows="3"
                            dir="rtl"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group half">
                          <label>Country</label>
                          <select 
                            name="country_code" 
                            value={profileForm.country_code} 
                            onChange={handleCountryChange}
                          >
                            {PROFILE_COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>{c.emoji} {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group half">
                          <label>Currency</label>
                          <select 
                            name="currency_code" 
                            value={profileForm.currency_code} 
                            onChange={handleProfileChange}
                          >
                            {PROFILE_CURRENCIES.map(curr => (
                              <option key={curr.code} value={curr.code}>{curr.code} — {curr.symbol} — {curr.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="settings-card">
                      <h3>Color Palette Settings</h3>
                      <div className="color-pickers-grid">
                        <div className="color-field-row">
                          <label>Primary Theme (Buttons, accents)</label>
                          <div className="color-picker-input-group">
                            <input 
                              type="color" 
                              value={profileForm.theme_color} 
                              onChange={(e) => handleColorPickerChange('theme_color', e.target.value)} 
                            />
                            <input 
                              type="text" 
                              className="color-hex-text"
                              value={colorInputs.theme_color} 
                              onChange={(e) => handleColorTextChange('theme_color', e.target.value)}
                              maxLength="7"
                            />
                          </div>
                        </div>

                        <div className="color-field-row">
                          <label>Secondary Color (Product details block)</label>
                          <div className="color-picker-input-group">
                            <input 
                              type="color" 
                              value={profileForm.secondary_color} 
                              onChange={(e) => handleColorPickerChange('secondary_color', e.target.value)} 
                            />
                            <input 
                              type="text" 
                              className="color-hex-text"
                              value={colorInputs.secondary_color} 
                              onChange={(e) => handleColorTextChange('secondary_color', e.target.value)}
                              maxLength="7"
                            />
                          </div>
                        </div>

                        <div className="color-field-row">
                          <label>Base Text (Titles, descriptions)</label>
                          <div className="color-picker-input-group">
                            <input 
                              type="color" 
                              value={profileForm.text_color} 
                              onChange={(e) => handleColorPickerChange('text_color', e.target.value)} 
                            />
                            <input 
                              type="text" 
                              className="color-hex-text"
                              value={colorInputs.text_color} 
                              onChange={(e) => handleColorTextChange('text_color', e.target.value)}
                              maxLength="7"
                            />
                          </div>
                        </div>

                        <div className="color-field-row">
                          <label>Background (Main layout bg)</label>
                          <div className="color-picker-input-group">
                            <input 
                              type="color" 
                              value={profileForm.background_color} 
                              onChange={(e) => handleColorPickerChange('background_color', e.target.value)} 
                            />
                            <input 
                              type="text" 
                              className="color-hex-text"
                              value={colorInputs.background_color} 
                              onChange={(e) => handleColorTextChange('background_color', e.target.value)}
                              maxLength="7"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="settings-card">
                      <h3>Social Media & Links</h3>
                      <div className="form-row">
                        <div className="form-group half">
                          <label>WhatsApp Number</label>
                          <input 
                            type="text" 
                            name="whatsapp" 
                            placeholder="e.g. 96170123456" 
                            value={profileForm.whatsapp} 
                            onChange={handleProfileChange} 
                          />
                        </div>
                        <div className="form-group half">
                          <label>Phone Number</label>
                          <input 
                            type="text" 
                            name="phone" 
                            placeholder="e.g. +961123456" 
                            value={profileForm.phone} 
                            onChange={handleProfileChange} 
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group half">
                          <label>Google Map Link</label>
                          <input 
                            type="text" 
                            name="google_map" 
                            placeholder="Google Maps URL" 
                            value={profileForm.google_map} 
                            onChange={handleProfileChange} 
                          />
                        </div>
                        <div className="form-group half">
                          <label>Instagram Handle</label>
                          <input 
                            type="text" 
                            name="instagram" 
                            placeholder="@instagram_handle" 
                            value={profileForm.instagram} 
                            onChange={handleProfileChange} 
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group half">
                          <label>Snapchat Handle</label>
                          <input 
                            type="text" 
                            name="snapchat" 
                            placeholder="Snapchat Username" 
                            value={profileForm.snapchat} 
                            onChange={handleProfileChange} 
                          />
                        </div>
                        <div className="form-group half">
                          <label>Twitter/X Handle</label>
                          <input 
                            type="text" 
                            name="twitter" 
                            placeholder="X handle" 
                            value={profileForm.twitter} 
                            onChange={handleProfileChange} 
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  {!isStaff && (
                    <button 
                      type="submit" 
                      className="btn-save-profile" 
                      disabled={saveLoading || isAnyUploading}
                    >
                      {isAnyUploading ? 'Uploading image...' : (saveLoading ? 'Saving...' : 'Save Settings')}
                    </button>
                  )}
                </form>

                <div className="settings-card" style={{ marginTop: '24px' }}>
                  <h3>Security</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginBottom: '16px' }}>
                    Change your account password.
                  </p>
                  <div style={{ maxWidth: '400px' }}>
                    <ChangePasswordForm lang="en" />
                  </div>
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="profile-preview-col">
                <div className="preview-sticky-card">
                  <h3>Restaurant Visual Card</h3>
                  
                  <div className="image-uploads-box" style={{ flexDirection: 'column', gap: '16px' }}>
                    <div className="uploader-item">
                      <label>Logo Image</label>
                      {isStaff ? (
                        <div className="logo-upload-square disabled">
                          {logoPreview ? <img src={logoPreview} alt="Logo" /> : <span>No Logo</span>}
                        </div>
                      ) : (
                        <FileInput
                          id="profile-logo-upload"
                          currentUrl={logoPreview}
                          onFile={(file) => handleImageChange(file, 'logo')}
                          uploading={logoUploading}
                        />
                      )}
                    </div>

                    <div className="uploader-item full-width-uploader">
                      <label>Cover Banner Image</label>
                      {isStaff ? (
                        <div className="cover-upload-rect disabled">
                          {coverPreview ? <img src={coverPreview} alt="Cover" /> : <span>No Cover Image</span>}
                        </div>
                      ) : (
                        <FileInput
                          id="profile-cover-upload"
                          currentUrl={coverPreview}
                          onFile={(file) => handleImageChange(file, 'cover')}
                          uploading={coverUploading}
                        />
                      )}
                    </div>
                  </div>

                  <div 
                    className="visual-preview-demo" 
                    style={{ 
                      backgroundColor: profileForm.background_color, 
                      color: profileForm.text_color,
                      borderTop: `6px solid ${profileForm.theme_color}`
                    }}
                  >
                    <div className="visual-preview-header">
                      <div className="visual-logo-holder" style={{ borderColor: profileForm.theme_color }}>
                        {logoPreview ? <img src={logoPreview} alt="" /> : 'Logo'}
                      </div>
                      <div>
                        <h4 style={{ color: profileForm.text_color }}>{profileForm.name_en || 'Restaurant Name'}</h4>
                        <p style={{ color: profileForm.text_color, opacity: 0.7 }}>{profileForm.name_ar || 'اسم المطعم'}</p>
                      </div>
                    </div>

                    <div className="preview-circular-tiles-row">
                      <div className="preview-circular-tile active">
                        <div className="tile-circle-preview" style={{ borderColor: profileForm.theme_color, boxShadow: `0 3px 8px ${profileForm.theme_color}33` }}></div>
                        <span className="tile-text-preview" style={{ color: profileForm.theme_color }}>Category</span>
                      </div>
                      <div className="preview-circular-tile">
                        <div className="tile-circle-preview"></div>
                        <span className="tile-text-preview" style={{ color: profileForm.text_color, opacity: 0.6 }}>Category</span>
                      </div>
                    </div>

                    <div className="preview-secondary-block" style={{ backgroundColor: profileForm.secondary_color, color: 'rgba(255, 255, 255, 0.95)' }}>
                      <span className="preview-product-title">Product details container</span>
                      <div className="preview-product-price-badge" style={{ color: profileForm.text_color }}>
                        $10.00
                      </div>
                    </div>
                  </div>
                </div>

                {/* Merchant PIN Card */}
                <div style={{
                  marginTop: '24px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F59E0B',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>
                        Merchant PIN / <span style={{ fontFamily: 'var(--font-ar)' }}>رمز التاجر</span>
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-soft)', lineHeight: '1.4' }}>
                        Share this with authorized staff only. Diners will enter it to claim a coupon.
                      </p>
                    </div>
                    <span style={{ fontSize: '20px' }}>🔑</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    margin: '20px 0',
                    background: '#F9FAFB',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px 8px'
                  }}>
                    <span style={{
                      fontSize: '28px',
                      fontWeight: '800',
                      fontFamily: 'monospace',
                      letterSpacing: revealMerchantPin ? '6px' : '4px',
                      color: 'var(--primary-color)'
                    }}>
                      {revealMerchantPin 
                        ? (company?.merchant_pin || '512840') 
                        : '• • • • • •'
                      }
                    </span>

                    <button
                      type="button"
                      onClick={() => setRevealMerchantPin(!revealMerchantPin)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-soft)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={revealMerchantPin ? 'Hide PIN' : 'Reveal PIN'}
                    >
                      {revealMerchantPin ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(company?.merchant_pin || '512840');
                          setCopiedMerchantPin(true);
                          setTimeout(() => setCopiedMerchantPin(false), 2000);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '6px',
                        backgroundColor: copiedMerchantPin ? '#DCFCE7' : '#FFFFFF',
                        color: copiedMerchantPin ? 'var(--primary-color)' : 'var(--text)',
                        border: '1px solid var(--border)',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      <span>{copiedMerchantPin ? 'Copied!' : 'Copy PIN'}</span>
                    </button>
                  </div>

                  <div style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '11px',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    lineHeight: '1.4'
                  }}>
                    <span>⚠️</span>
                    <span>Do not display publicly. Do not share on social media.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BRANCHES MANAGEMENT TAB */}
          {activeTab === 'branches' && (
            <div className="branches-tab-container">
              <div className="settings-card">
                <div className="panel-header" style={{ borderBottom: 'none', padding: 0 }}>
                  <div>
                    <h3>Restaurant Branches</h3>
                    <p style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '4px' }}>
                      Configure locations. Customers landing on your menu URL will choose from active branches.
                    </p>
                  </div>
                  {!isLocked && (
                    <button className="btn-add-primary" onClick={() => openBranchForm()}>
                      + Add Branch
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-card" style={{ marginTop: '20px' }}>
                <div className="table-responsive">
                  <table className="team-table">
                    <thead>
                      <tr>
                        <th>Branch Name</th>
                        <th>URL Slug</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Default</th>
                        {!isLocked && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map(b => (
                        <tr key={b.id}>
                          <td>
                            <div className="member-email-col">
                              <div className="member-avatar" style={{ fontSize: '13px', fontWeight: 600 }}>
                                📍
                              </div>
                              <div>
                                <span style={{ fontWeight: 600, display: 'block' }}>{b.name_en}</span>
                                <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{b.name_ar}</span>
                              </div>
                            </div>
                          </td>
                          <td><code>/{b.slug}</code></td>
                          <td>
                            <span style={{ fontSize: '13px' }}>{b.address_en || '—'}</span>
                          </td>
                          <td>
                            {isLocked ? (
                              <span className={`status-badge ${b.is_active ? 'available' : 'unavailable'}`}>
                                {b.is_active ? 'Active' : 'Inactive'}
                              </span>
                            ) : (
                              <label className="checkbox-availability-inline">
                                <input 
                                  type="checkbox"
                                  checked={b.is_active}
                                  onChange={() => handleToggleBranchActive(b)}
                                />
                                <span>Active</span>
                              </label>
                            )}
                          </td>
                          <td>
                            {b.is_default ? (
                              <span className="role-badge owner" style={{ background: 'var(--primary-soft)', color: 'var(--primary-color)' }}>
                                Default
                              </span>
                            ) : (
                              !isLocked && (
                                <button className="btn-edit-text" onClick={() => handleSetDefaultBranch(b.id)}>
                                  Set Default
                                </button>
                              )
                            )}
                          </td>
                          {!isLocked && (
                            <td>
                              <div className="member-actions-group">
                                <button className="btn-edit-text" onClick={() => openBranchForm(b)}>
                                  Edit
                                </button>
                                <button className="btn-delete-text" onClick={() => confirmDeleteBranch(b)}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MENU MANAGEMENT TAB */}
          {activeTab === 'menu' && (
            <div className="menu-mgmt-grid-wrapper">
              
              {/* Scoped Branch Selector inside Menu Tab */}
              <div className="menu-branch-scope-selector settings-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>Scoped Branch Scope</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#7f8c8d' }}>
                      All category and product edits below are scoped to this branch.
                    </p>
                  </div>
                  <div className="company-select-wrapper" style={{ width: '220px' }}>
                    <select 
                      value={selectedBranchId} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBranchId(val);
                        sessionStorage.setItem('qrious:selectedBranchId', val);
                      }}
                      className="sidebar-company-select"
                      style={{ padding: '8px 12px' }}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name_en} / {b.name_ar} {b.is_default ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="select-arrow-indicator" style={{ top: '55%' }}>▼</div>
                  </div>
                </div>
              </div>

              <div className="menu-mgmt-grid">
                {/* Left Categories Manager */}
                <div className="categories-panel">
                  <div className="panel-header">
                    <h3>Categories</h3>
                    {!isLocked && (
                      <button className="btn-add-icon" onClick={() => {
                        setShowAddCat(true);
                        setEditingCatId(null);
                        setCatForm({ name_en: '', name_ar: '', image_url: '' });
                        setCatImageFile(null);
                        setCatImagePreview('');
                      }}>
                        + Add
                      </button>
                    )}
                  </div>

                  {showAddCat && !isLocked && (
                    <form onSubmit={handleAddCatSubmit} className="inline-add-form">
                      <input 
                        type="text" 
                        placeholder="Name (English)" 
                        value={catForm.name_en} 
                        onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })} 
                        required 
                      />
                      <input 
                        type="text" 
                        placeholder="الأسم بالعربي" 
                        value={catForm.name_ar} 
                        onChange={(e) => setCatForm({ ...catForm, name_ar: e.target.value })} 
                        dir="rtl"
                        required 
                      />
                      
                      <div className="cat-image-selector-box" style={{ width: '100%' }}>
                        <label>Category Icon Image</label>
                        <FileInput
                          id="cat-add-image"
                          currentUrl={catImagePreview}
                          onFile={handleCatImageChange}
                          uploading={catImageUploading}
                        />
                      </div>

                      <div className="inline-btn-row">
                        <button type="submit" className="btn-inline-submit" disabled={isAnyUploading}>
                          {isAnyUploading ? 'Uploading...' : 'Create'}
                        </button>
                        <button type="button" className="btn-inline-cancel" onClick={() => setShowAddCat(false)} disabled={isAnyUploading}>Cancel</button>
                      </div>
                    </form>
                  )}

                  <div className="categories-list">
                    {categories.map((cat, idx) => (
                      <div 
                        key={cat.id} 
                        className={`cat-list-item ${selectedCatId === cat.id ? 'active' : ''} ${draggingCatId === cat.id ? 'dragging' : ''} ${dragOverCatId === cat.id ? 'dragover' : ''}`}
                        onClick={() => {
                          setSelectedCatId(cat.id);
                          setEditingCatId(null);
                        }}
                        draggable={!isLocked && editingCatId !== cat.id}
                        onDragStart={(e) => {
                          if (isLocked) return;
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', cat.id);
                          setDraggingCatId(cat.id);
                        }}
                        onDragOver={(e) => {
                          if (isLocked) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverCatId !== cat.id) setDragOverCatId(cat.id);
                        }}
                        onDragLeave={() => {
                          if (isLocked) return;
                          setDragOverCatId(null);
                        }}
                        onDrop={(e) => {
                          if (isLocked) return;
                          e.preventDefault();
                          const fromId = e.dataTransfer.getData('text/plain');
                          handleCategoryReorder(fromId, cat.id);
                          setDraggingCatId(null);
                          setDragOverCatId(null);
                        }}
                        onDragEnd={() => {
                          setDraggingCatId(null);
                          setDragOverCatId(null);
                        }}
                      >
                        {editingCatId === cat.id && !isLocked ? (
                          <div className="cat-inline-edit" onClick={e => e.stopPropagation()}>
                            <input 
                              type="text" 
                              value={catForm.name_en} 
                              onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })} 
                            />
                            <input 
                              type="text" 
                              value={catForm.name_ar} 
                              onChange={(e) => setCatForm({ ...catForm, name_ar: e.target.value })} 
                              dir="rtl"
                            />
                            
                            <div className="cat-image-selector-box" style={{ width: '100%', marginTop: '10px' }}>
                              <FileInput
                                id={`cat-edit-image-${cat.id}`}
                                currentUrl={catImagePreview || cat.image_url}
                                onFile={handleCatImageChange}
                                uploading={catImageUploading}
                              />
                            </div>

                            <div className="edit-actions">
                              <button className="btn-check" onClick={() => handleUpdateCatSubmit(cat.id)} disabled={isAnyUploading}>
                                {isAnyUploading ? 'Uploading...' : '✔ Save'}
                              </button>
                              <button className="btn-cross" onClick={() => {
                                setEditingCatId(null);
                                setCatImageFile(null);
                                setCatImagePreview('');
                              }} disabled={isAnyUploading}>✖ Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="cat-details-row">
                              {!isLocked && (
                                <div className="cat-drag-handle" title="Drag to reorder">
                                  <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                                    <circle cx="3" cy="3" r="1.5" />
                                    <circle cx="3" cy="9" r="1.5" />
                                    <circle cx="3" cy="15" r="1.5" />
                                    <circle cx="9" cy="3" r="1.5" />
                                    <circle cx="9" cy="9" r="1.5" />
                                    <circle cx="9" cy="15" r="1.5" />
                                  </svg>
                                </div>
                              )}
                              <div className="cat-circle-thumbnail">
                                {cat.image_url ? <img src={cat.image_url} alt="" /> : null}
                              </div>
                              <div className="cat-details">
                                <span className="cat-title-en">{cat.name_en}</span>
                                <span className="cat-title-ar">{cat.name_ar}</span>
                              </div>
                            </div>
                            
                            {!isLocked && (
                              <div className="cat-actions" onClick={e => e.stopPropagation()}>
                                <button 
                                  className="btn-edit"
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setCatForm({ name_en: cat.name_en, name_ar: cat.name_ar, image_url: cat.image_url || '' });
                                    setCatImageFile(null);
                                    setCatImagePreview('');
                                  }}
                                >
                                  ✏
                                </button>
                                <button className="btn-delete" onClick={() => confirmDeleteCategory(cat)}>
                                  🗑
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    
                    {categories.length === 0 && <div className="empty-state">No categories created yet.</div>}
                  </div>
                </div>

                {/* Right Products Panel */}
                <div className="products-panel">
                  <div className="panel-header">
                    <h3>
                      Products inside <em>{activeCategory ? activeCategory.name_en : 'Selected Category'}</em>
                    </h3>
                    {!isLocked && (
                      <button 
                        className="btn-add-primary"
                        disabled={categories.length === 0}
                        onClick={() => openProductForm()}
                      >
                        + Add Product
                      </button>
                    )}
                  </div>

                  <div className="products-grid-dashboard">
                    {filteredProducts.map(p => (
                      <div 
                        key={p.id} 
                        className={`product-dash-card ${!p.is_available ? 'dash-unavailable' : ''} ${draggingProdId === p.id ? 'dragging' : ''} ${dragOverProdId === p.id ? 'dragover' : ''}`}
                        draggable={!isLocked}
                        onDragStart={(e) => {
                          if (isLocked) return;
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', p.id);
                          setDraggingProdId(p.id);
                        }}
                        onDragOver={(e) => {
                          if (isLocked) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverProdId !== p.id) setDragOverProdId(p.id);
                        }}
                        onDragLeave={() => {
                          if (isLocked) return;
                          setDragOverProdId(null);
                        }}
                        onDrop={(e) => {
                          if (isLocked) return;
                          e.preventDefault();
                          const fromId = e.dataTransfer.getData('text/plain');
                          handleProductReorder(fromId, p.id);
                          setDraggingProdId(null);
                          setDragOverProdId(null);
                        }}
                        onDragEnd={() => {
                          setDraggingProdId(null);
                          setDragOverProdId(null);
                        }}
                      >
                        <div className="product-dash-img">
                          {p.image_url ? <img src={p.image_url} alt="" /> : <div className="no-img-placeholder">No Image</div>}
                        </div>
                        <div className="product-dash-details">
                          <div className="product-dash-header">
                            {!isLocked && (
                              <div className="prod-drag-handle" title="Drag to reorder" style={{ cursor: 'grab', color: 'var(--text-soft)', marginRight: '6px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                                  <circle cx="2.5" cy="2.5" r="1.2" />
                                  <circle cx="2.5" cy="7" r="1.2" />
                                  <circle cx="2.5" cy="11.5" r="1.2" />
                                  <circle cx="7.5" cy="2.5" r="1.2" />
                                  <circle cx="7.5" cy="7" r="1.2" />
                                  <circle cx="7.5" cy="11.5" r="1.2" />
                                </svg>
                              </div>
                            )}
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{p.name_en} / {p.name_ar}</span>
                              {p.coupon_category && (
                                <span 
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: `${company?.secondary_color || '#E06A3B'}18`,
                                    color: company?.secondary_color || '#E06A3B',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    display: 'inline-block'
                                  }}
                                >
                                  {p.coupon_category === 'main_course' ? 'MAIN' : p.coupon_category === 'dessert' ? 'DESSERT' : 'BEVERAGE'}
                                </span>
                              )}
                            </h4>
                            <span className="price-tag">{currencySymbol} {p.price}</span>
                          </div>
                          <p className="product-dash-desc">{p.description_en || 'No description available.'}</p>
                          
                          <div className="product-dash-metadata-row">
                            {p.tags && p.tags.map(tslug => {
                              const tag = tagsList.find(t => t.slug === tslug);
                              return tag ? (
                                <span key={tslug} className="p-badge tag" style={{ backgroundColor: `${tag.color}18`, color: tag.color }}>
                                  {tag.name_en}
                                </span>
                              ) : null;
                            })}
                            {p.allergens && p.allergens.map(aslug => {
                              const allergen = allergensList.find(a => a.slug === aslug);
                              return allergen ? (
                                <span key={aslug} className="p-badge allergen" title={allergen.name_en}>
                                  {allergen.icon} {allergen.name_en}
                                </span>
                              ) : null;
                            })}
                          </div>

                          <div className="product-dash-footer">
                            {isLocked ? (
                              <span className={`status-badge ${p.is_available ? 'available' : 'unavailable'}`}>
                                {p.is_available ? 'Available' : 'Sold Out'}
                              </span>
                            ) : (
                              <label className="checkbox-availability-inline" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox"
                                  checked={p.is_available}
                                  onChange={(e) => handleToggleAvailability(e, p)}
                                />
                                <span>Available</span>
                              </label>
                            )}
                            
                            {p.calories && <span className="cal-badge">{p.calories} kcal</span>}
                            
                            <div className="product-card-actions">
                              <button className="btn-edit-text" onClick={() => openProductForm(p, isLocked)}>
                                {isLocked ? 'View' : 'Edit'}
                              </button>
                              {!isLocked && (
                                <>
                                  <button className="btn-edit-text" onClick={(e) => handleDuplicateProduct(e, p)}>
                                    Duplicate
                                  </button>
                                  <button className="btn-delete-text" onClick={() => handleDeleteProduct(p.id)}>
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredProducts.length === 0 && (
                      <div className="empty-state-products">
                        <h3>No products in this category</h3>
                        <p>Click "Add Product" above to build your menu offerings.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OPERATOR TAB */}
          {activeTab === 'operator' && (
            <OperatorConsoleTab company={company} />
          )}

          {/* QR CODE TAB */}
          {activeTab === 'qr' && (
            <QrTab company={company} branches={branches} isLocked={isLocked} />
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="analytics-tab-container">
              <div className="analytics-header-controls">
                <h3>Insights Summary</h3>
                
                {/* Scoped Branch Filter for Analytics */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="company-select-wrapper" style={{ width: '200px' }}>
                    <select
                      value={analyticsBranchId}
                      onChange={e => setAnalyticsBranchId(e.target.value)}
                      className="sidebar-company-select"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="all">All Branches (Aggregate)</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name_en}</option>
                      ))}
                    </select>
                    <div className="select-arrow-indicator" style={{ top: '55%' }}>▼</div>
                  </div>
                  
                  <div className="analytics-range-selector">
                    <button 
                      className={analyticsRange === 7 ? 'active' : ''} 
                      onClick={() => setAnalyticsRange(7)}
                    >
                      Last 7 Days
                    </button>
                    <button 
                      className={analyticsRange === 30 ? 'active' : ''} 
                      onClick={() => setAnalyticsRange(30)}
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>
              </div>

              <div className="stats-row">
                <div className="stat-card">
                  <span className="stat-label">Total Visits ({analyticsRange}d)</span>
                  <span className="stat-value">
                    {lastNDaysVisitors.reduce((sum, v) => sum + v.count, 0)}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Total Product Clicks</span>
                  <span className="stat-value">
                    {analytics.topProducts.reduce((sum, p) => sum + p.count, 0)}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Avg. Visitors/Day</span>
                  <span className="stat-value">
                    {Math.round(lastNDaysVisitors.reduce((sum, v) => sum + v.count, 0) / analyticsRange)}
                  </span>
                </div>
              </div>

              <div className="analytics-charts-grid">
                <div className="chart-card-full">
                  <h4>Daily Visitor Count</h4>
                  {lastNDaysVisitors.reduce((sum, v) => sum + v.count, 0) === 0 ? (
                    <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)', fontSize: '15px' }}>
                      No visits yet.
                    </div>
                  ) : (
                    <LineChart 
                      data={lastNDaysVisitors.map(v => ({ label: v.date, value: v.count }))} 
                      color="var(--primary-color)" 
                      height={240} 
                    />
                  )}
                </div>

                <div className="chart-card-sidebar">
                  <h4>Top 10 Popular Dishes (Clicks)</h4>
                  {analytics.topProducts.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-soft)', fontSize: '15px' }}>
                      No product clicks yet.
                    </div>
                  ) : (
                    <BarChart 
                      data={analytics.topProducts} 
                      color="var(--primary-color)" 
                    />
                  )}
                </div>
              </div>

              {/* Coupons Analytics Card */}
              <div className="chart-card-full" style={{ marginTop: '24px' }}>
                <h4>Coupons — last 30 days</h4>
                {!couponStats || couponStats.issued === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-soft)', fontSize: '15px' }}>
                    No coupons issued for this restaurant yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Stat pills */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div className="stat-card" style={{ flex: 1, minWidth: '100px', border: '1px solid var(--border)', background: 'var(--bg)', padding: '12px' }}>
                        <span className="stat-label" style={{ fontSize: '12px' }}>Issued</span>
                        <span className="stat-value" style={{ fontSize: '20px', fontWeight: '800' }}>{couponStats.issued}</span>
                      </div>
                      <div className="stat-card" style={{ flex: 1, minWidth: '100px', border: '1px solid rgba(14, 124, 123, 0.2)', background: 'rgba(14, 124, 123, 0.04)', padding: '12px' }}>
                        <span className="stat-label" style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Used</span>
                        <span className="stat-value" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary-color)' }}>{couponStats.used}</span>
                      </div>
                      <div className="stat-card" style={{ flex: 1, minWidth: '100px', border: '1px solid var(--border)', background: 'var(--bg)', padding: '12px', opacity: 0.6 }}>
                        <span className="stat-label" style={{ fontSize: '12px' }}>Expired</span>
                        <span className="stat-value" style={{ fontSize: '20px', fontWeight: '800' }}>{couponStats.expired}</span>
                      </div>
                      <div className="stat-card" style={{ flex: 1, minWidth: '100px', border: '1px solid rgba(255, 87, 34, 0.2)', background: 'rgba(255, 87, 34, 0.04)', padding: '12px' }}>
                        <span className="stat-label" style={{ fontSize: '12px', color: 'var(--primary-color)' }}>Active</span>
                        <span className="stat-value" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-color)' }}>{couponStats.active}</span>
                      </div>
                    </div>

                    {/* Category Breakdown Horizontal Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Category Breakdown (Used / Total Issued)</h5>
                      {Object.entries({
                        main_course: 'Main Course',
                        dessert: 'Dessert',
                        beverage: 'Beverage'
                      }).map(([catKey, catLabel]) => {
                        const defaultVal = { used: 0, available: 0, total: 0 };
                        const catData = couponStats.category_breakdown?.[catKey] || defaultVal;
                        const used = catData.used || 0;
                        const available = catData.available || 0;
                        const total = catData.total || (used + available);
                        
                        const pct = total > 0 ? Math.round((used / total) * 100) : 0;

                        return (
                          <div key={catKey} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '120px', fontSize: '13px', fontWeight: '600', color: 'var(--text)', flexShrink: 0 }}>
                              {catLabel}
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                              <svg width="100%" height="8" style={{ display: 'block', overflow: 'visible' }}>
                                <rect width="100%" height="8" rx="4" fill="var(--surface-2)" />
                                <rect width={`${pct}%`} height="8" rx="4" fill="var(--primary-color)" style={{ transition: 'width 0.8s ease-out' }} />
                              </svg>
                            </div>
                            <div style={{ width: '60px', fontSize: '13px', fontWeight: '700', color: 'var(--text-soft)', textAlign: 'right', flexShrink: 0 }}>
                              {used} / {total}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TEAM MANAGEMENT TAB */}
          {activeTab === 'team' && (
            <div className="team-tab-layout">
              {!isLocked && (
                <div className="settings-card team-invite-card">
                  <h3>Invite Team Member</h3>
                  <form onSubmit={handleInviteSubmit} className="invite-form-grid">
                    <div className="form-group flex-1">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        placeholder="collaborator@restaurant.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group flex-select">
                      <label>Role</label>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                        <option value="staff">Staff (View Only)</option>
                        <option value="manager">Manager (Menu CRUD)</option>
                        {activeRole === 'owner' && <option value="owner">Owner (Full Admin)</option>}
                      </select>
                    </div>
                    <button type="submit" className="btn-add-primary btn-invite-submit" disabled={saveLoading}>
                      Create Invite Link
                    </button>
                  </form>

                  {generatedInviteLink && (
                    <div className="generated-invite-box">
                      <p>Share this invitation link with your team member:</p>
                      <div className="url-copy-box">
                        <input type="text" readOnly value={generatedInviteLink} className="url-copy-input" />
                        <button className="btn-copy-url" onClick={() => {
                          navigator.clipboard.writeText(generatedInviteLink);
                          showAlert('success', 'Invitation link copied!');
                        }}>
                          Copy Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="settings-card team-table-card">
                <h3>Active Members</h3>
                <div className="table-responsive">
                  <table className="team-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                        {!isLocked && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => {
                        const isSelf = member.user_id === user.id;
                        const isOwnerRow = member.role === 'owner';
                        
                        const canManageRow = !isLocked && !isSelf && !isOwnerRow && 
                          (activeRole === 'owner' || (activeRole === 'manager' && member.role === 'staff'));

                        return (
                          <tr key={member.id || member.user_id}>
                            <td>
                              <div className="member-email-col">
                                <div className="member-avatar">
                                  {(member.email || 'M').charAt(0).toUpperCase()}
                                </div>
                                <span>{member.email || `User (${member.user_id.substring(0,6)})`} {isSelf && '(You)'}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`role-badge ${member.role}`}>
                                {isOwnerRow && <span className="badge-lock">🔒</span>}
                                {member.role}
                              </span>
                            </td>
                            <td>{new Date(member.created_at).toLocaleDateString()}</td>
                            {!isLocked && (
                              <td>
                                {canManageRow ? (
                                  <div className="member-actions-group">
                                    <select 
                                      value={member.role}
                                      onChange={(e) => handleChangeRole(member.id || member.user_id, e.target.value)}
                                      className="role-change-select"
                                    >
                                      <option value="staff">Staff</option>
                                      <option value="manager">Manager</option>
                                      {activeRole === 'owner' && <option value="owner">Owner</option>}
                                    </select>
                                    <button 
                                      className="btn-delete-text" 
                                      onClick={() => handleRemoveMember(member.id || member.user_id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <span className="action-na">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="settings-card team-table-card" style={{ marginTop: '24px' }}>
                <h3>Pending Invitations</h3>
                {invites.length > 0 ? (
                  <div className="table-responsive">
                    <table className="team-table">
                      <thead>
                        <tr>
                          <th>Invited Email</th>
                          <th>Role</th>
                          <th>Expires</th>
                          {!isLocked && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {invites.map(inv => {
                          const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
                          const inviteLink = `${baseUrl}/invite/${inv.token}`;
                          const isExpired = new Date(inv.expires_at) < new Date();

                          return (
                            <tr key={inv.id}>
                              <td>{inv.email}</td>
                              <td><span className={`role-badge ${inv.role}`}>{inv.role}</span></td>
                              <td>
                                {isExpired ? (
                                  <span style={{ color: '#E74C3C', fontWeight: 600 }}>Expired</span>
                                ) : (
                                  new Date(inv.expires_at).toLocaleDateString()
                                )}
                              </td>
                              {!isLocked && (
                                <td>
                                  <div className="pending-actions-group">
                                    <button className="btn-edit-text" onClick={() => handleResendInvite(inv.token)} style={{ marginRight: '8px' }}>
                                      Resend Email
                                    </button>
                                    <button className="btn-edit-text" onClick={() => {
                                      navigator.clipboard.writeText(inviteLink);
                                      showAlert('success', 'Invite link copied!');
                                    }}>
                                      Copy Link
                                    </button>
                                    <button className="btn-delete-text" onClick={() => handleRevokeInvite(inv.id)}>
                                      Revoke
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '24px 0' }}>No pending invitations.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CASCADING CATEGORY DELETE CONFIRMATION MODAL */}
      {showDeleteCatModal && catToDelete && (
        <div className="modal-backdrop">
          <div className="modal-content-wrapper confirm-delete-modal">
            <header className="modal-header">
              <h3 style={{ color: '#E74C3C' }}>Confirm Deletion</h3>
              <button className="btn-close-modal" onClick={() => setShowDeleteCatModal(false)}>✖</button>
            </header>
            <div className="confirm-delete-body" style={{ padding: '20px' }}>
              <p className="warning-text-alert" style={{ color: '#E74C3C', fontWeight: 700, marginBottom: '16px' }}>
                ⚠️ WARNING: Deleting the category "{catToDelete.name_en}" will permanently delete all products ({products.filter(p => p.category_id === catToDelete.id).length} items) assigned to it!
              </p>
              <div className="form-group">
                <label>Type the category name <strong>{catToDelete.name_en}</strong> to confirm:</label>
                <input 
                  type="text" 
                  value={deleteCatConfirmName} 
                  onChange={e => setDeleteCatConfirmName(e.target.value)}
                  placeholder={catToDelete.name_en}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </div>
            <footer className="modal-footer-btn-row">
              <button 
                type="button" 
                className="btn-modal-submit" 
                disabled={deleteCatConfirmName !== catToDelete.name_en}
                onClick={executeDeleteCategory}
                style={{ background: '#E74C3C' }}
              >
                Permanently Delete Category
              </button>
              <button type="button" className="btn-modal-cancel" onClick={() => setShowDeleteCatModal(false)}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* CASCADING BRANCH DELETE CONFIRMATION MODAL */}
      {showDeleteBranchModal && branchToDelete && (
        <div className="modal-backdrop">
          <div className="modal-content-wrapper confirm-delete-modal">
            <header className="modal-header">
              <h3 style={{ color: '#E74C3C' }}>Confirm Branch Deletion</h3>
              <button className="btn-close-modal" onClick={() => setShowDeleteBranchModal(false)}>✖</button>
            </header>
            <div className="confirm-delete-body" style={{ padding: '20px' }}>
              <p className="warning-text-alert" style={{ color: '#E74C3C', fontWeight: 700, marginBottom: '16px' }}>
                ⚠️ WARNING: Deleting the branch "{branchToDelete.name_en}" will permanently delete all categories and products assigned to this branch!
              </p>
              <div className="form-group">
                <label>Type the branch name <strong>{branchToDelete.name_en}</strong> to confirm:</label>
                <input 
                  type="text" 
                  value={deleteBranchConfirmName} 
                  onChange={e => setDeleteBranchConfirmName(e.target.value)}
                  placeholder={branchToDelete.name_en}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </div>
            <footer className="modal-footer-btn-row">
              <button 
                type="button" 
                className="btn-modal-submit" 
                disabled={deleteBranchConfirmName !== branchToDelete.name_en}
                onClick={executeDeleteBranch}
                style={{ background: '#E74C3C' }}
              >
                Permanently Delete Branch
              </button>
              <button type="button" className="btn-modal-cancel" onClick={() => setShowDeleteBranchModal(false)}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* BRANCH ADD/EDIT MODAL */}
      {showBranchModal && (
        <div className="modal-backdrop">
          <div className="modal-content-wrapper" style={{ maxWidth: '640px' }}>
            <header className="modal-header">
              <h3>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h3>
              <button className="btn-close-modal" onClick={() => setShowBranchModal(false)}>✖</button>
            </header>

            <form onSubmit={handleBranchSubmit} className="modal-form">
              <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div className="form-row">
                  <div className="form-group half">
                    <label>Branch Name (English)</label>
                    <input 
                      type="text" 
                      value={branchForm.name_en} 
                      onChange={e => setBranchForm({ ...branchForm, name_en: e.target.value })} 
                      placeholder="e.g. Beirut Downtown" 
                      required 
                    />
                  </div>
                  <div className="form-group half">
                    <label>Branch Name (Arabic)</label>
                    <input 
                      type="text" 
                      value={branchForm.name_ar} 
                      onChange={e => setBranchForm({ ...branchForm, name_ar: e.target.value })} 
                      placeholder="بيروت وسط المدينة" 
                      dir="rtl"
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>URL Slug Path</label>
                    <input 
                      type="text" 
                      value={branchForm.slug} 
                      onChange={e => setBranchForm({ ...branchForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} 
                      placeholder="beirut-downtown" 
                      required 
                    />
                  </div>
                  <div className="form-group half">
                    <label>Sort Order</label>
                    <input 
                      type="number" 
                      value={branchForm.sort_order} 
                      onChange={e => setBranchForm({ ...branchForm, sort_order: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Address (English)</label>
                    <input 
                      type="text" 
                      value={branchForm.address_en} 
                      onChange={e => setBranchForm({ ...branchForm, address_en: e.target.value })} 
                      placeholder="e.g. Downtown Beirut, Weygand St."
                    />
                  </div>
                  <div className="form-group half">
                    <label>Address (Arabic)</label>
                    <input 
                      type="text" 
                      value={branchForm.address_ar} 
                      onChange={e => setBranchForm({ ...branchForm, address_ar: e.target.value })} 
                      placeholder="وسط بيروت، شارع ويغان"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      value={branchForm.phone} 
                      onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} 
                      placeholder="+961123456" 
                    />
                  </div>
                  <div className="form-group half">
                    <label>WhatsApp Number</label>
                    <input 
                      type="text" 
                      value={branchForm.whatsapp} 
                      onChange={e => setBranchForm({ ...branchForm, whatsapp: e.target.value })} 
                      placeholder="96170123456" 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Google Maps Link</label>
                  <input 
                    type="text" 
                    value={branchForm.google_map} 
                    onChange={e => setBranchForm({ ...branchForm, google_map: e.target.value })} 
                    placeholder="https://maps.google.com/?q=..." 
                  />
                </div>

                {/* Branch cover image */}
                <div className="form-group">
                  <label>Branch Cover Image</label>
                  <FileInput
                    id="branch-cover-upload"
                    currentUrl={branchCoverPreview}
                    onFile={handleBranchCoverChange}
                    uploading={branchCoverUploading}
                  />
                </div>

                {/* Interactive Business Hours Grid */}
                <div className="form-group">
                  <label>Business Operating Hours</label>
                  <div className="branch-hours-editor-grid" style={{ marginTop: '8px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '12px', background: '#FAF8F5' }}>
                    {Object.entries(branchForm.hours).map(([dayKey, dayVal]) => (
                      <div key={dayKey} className="branch-hours-editor-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <span style={{ fontWeight: 600, width: '100px', fontSize: '13px' }}>{DAYS_MAP[dayKey]}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox"
                              checked={dayVal.closed}
                              onChange={e => handleBranchHoursChange(dayKey, 'closed', e.target.checked)}
                            />
                            <span>Closed</span>
                          </label>
                          {!dayVal.closed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input 
                                type="text"
                                value={dayVal.open}
                                onChange={e => handleBranchHoursChange(dayKey, 'open', e.target.value)}
                                placeholder="09:00"
                                style={{ width: '65px', padding: '4px', fontSize: '12px', textAlign: 'center' }}
                              />
                              <span style={{ fontSize: '11px', color: '#7f8c8d' }}>to</span>
                              <input 
                                type="text"
                                value={dayVal.close}
                                onChange={e => handleBranchHoursChange(dayKey, 'close', e.target.value)}
                                placeholder="23:00"
                                style={{ width: '65px', padding: '4px', fontSize: '12px', textAlign: 'center' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '16px' }}>
                  <div className="form-group half checkbox-group">
                    <label className="checkbox-label" style={{ margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={branchForm.is_active} 
                        onChange={e => setBranchForm({ ...branchForm, is_active: e.target.checked })} 
                      />
                      <span>Branch is Active</span>
                    </label>
                  </div>
                  <div className="form-group half checkbox-group">
                    <label className="checkbox-label" style={{ margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={branchForm.is_default} 
                        disabled={branchForm.is_default && editingBranch?.is_default} // Cannot unset default unless setting another
                        onChange={e => setBranchForm({ ...branchForm, is_default: e.target.checked })} 
                      />
                      <span>Set as Default Branch</span>
                    </label>
                  </div>
                </div>
              </fieldset>

              <footer className="modal-footer-btn-row" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-modal-submit" disabled={saveLoading || isAnyUploading}>
                  {isAnyUploading ? 'Uploading...' : (saveLoading ? 'Saving...' : 'Save Branch')}
                </button>
                <button type="button" className="btn-modal-cancel" onClick={() => setShowBranchModal(false)} disabled={isAnyUploading}>
                  Cancel
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      {showProductModal && (
        <div className="modal-backdrop">
          <div className="modal-content-wrapper">
            <header className="modal-header">
              <h3>{isLocked ? 'Product Details' : (editingProduct ? 'Edit Product' : 'Add New Product')}</h3>
              <button className="btn-close-modal" onClick={() => setShowProductModal(false)}>✖</button>
            </header>

            <form onSubmit={handleProductSubmit} className="modal-form">
              <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div className="form-row">
                  <div className="form-group half">
                    <label>Product Name (English)</label>
                    <input 
                      type="text" 
                      value={productForm.name_en} 
                      onChange={e => setProductForm({ ...productForm, name_en: e.target.value })} 
                      placeholder="e.g. Garlic Chicken Wings" 
                      required 
                    />
                  </div>
                  <div className="form-group half">
                    <label>Product Name (Arabic)</label>
                    <input 
                      type="text" 
                      value={productForm.name_ar} 
                      onChange={e => setProductForm({ ...productForm, name_ar: e.target.value })} 
                      placeholder="أجنحة دجاج بالثوم" 
                      dir="rtl"
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Description (English)</label>
                    <textarea 
                      value={productForm.description_en} 
                      onChange={e => setProductForm({ ...productForm, description_en: e.target.value })} 
                      placeholder="Crispy fried chicken wings..."
                      rows="3"
                    />
                  </div>
                  <div className="form-group half">
                    <label>Description (Arabic)</label>
                    <textarea 
                      value={productForm.description_ar} 
                      onChange={e => setProductForm({ ...productForm, description_ar: e.target.value })} 
                      placeholder="أجنحة دجاج مقلية مقرمشة..."
                      rows="3"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Price ({currencySymbol})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={productForm.price} 
                      onChange={e => setProductForm({ ...productForm, price: e.target.value })} 
                      placeholder="12.50" 
                      required 
                    />
                  </div>
                  <div className="form-group half">
                    <label>Calories (kcal) - Optional</label>
                    <input 
                      type="number" 
                      value={productForm.calories} 
                      onChange={e => setProductForm({ ...productForm, calories: e.target.value })} 
                      placeholder="340" 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={productForm.category_id} 
                    onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name_en} / {cat.name_ar}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Coupon category / <span style={{ fontFamily: 'var(--font-ar)' }}>فئة القسيمة</span></label>
                  <select 
                    value={productForm.coupon_category || ''} 
                    onChange={e => setProductForm({ ...productForm, coupon_category: e.target.value })}
                  >
                    <option value="">— None / لا شيء —</option>
                    <option value="main_course">Main course / طبق رئيسي</option>
                    <option value="dessert">Dessert / حلوى</option>
                    <option value="beverage">Beverage / مشروب</option>
                  </select>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-soft)' }}>
                    Optional. If set, this item can be selected when a customer redeems a coupon.
                  </p>
                </div>

                <div className="form-row">
                  <div className="form-group half select-checkbox-combobox-wrapper">
                    <label>Allergens</label>
                    <div className="combobox-trigger-box">
                      <button 
                        type="button" 
                        className="btn-combobox-trigger"
                        onClick={() => {
                          setShowAllergensDropdown(!showAllergensDropdown);
                          setShowTagsDropdown(false);
                        }}
                      >
                        {productForm.allergens.length === 0 ? (
                          <span className="placeholder">No allergens selected</span>
                        ) : (
                          <div className="trigger-chips-row">
                            {productForm.allergens.map(aslug => {
                              const allergen = allergensList.find(a => a.slug === aslug);
                              return (
                                <span key={aslug} className="trigger-chip-badge">
                                  {allergen ? `${allergen.icon} ${allergen.name_en}` : aslug}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className="combobox-arrow-badge">({productForm.allergens.length}) ▼</span>
                      </button>

                      {showAllergensDropdown && (
                        <div className="combobox-dropdown-card">
                          <div className="combobox-checklist">
                            {allergensList.map(allergen => {
                              const isChecked = productForm.allergens.includes(allergen.slug);
                              return (
                                <label key={allergen.slug} className="combobox-checkbox-option">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleAllergenToggle(allergen.slug)}
                                  />
                                  <span className="option-icon">{allergen.icon}</span>
                                  <span className="option-text">{allergen.name_en} / {allergen.name_ar}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group half select-checkbox-combobox-wrapper">
                    <label>Tags</label>
                    <div className="combobox-trigger-box">
                      <button 
                        type="button" 
                        className="btn-combobox-trigger"
                        onClick={() => {
                          setShowTagsDropdown(!showTagsDropdown);
                          setShowAllergensDropdown(false);
                        }}
                      >
                        {productForm.tags.length === 0 ? (
                          <span className="placeholder">No tags selected</span>
                        ) : (
                          <div className="trigger-chips-row">
                            {productForm.tags.map(tslug => {
                              const tag = tagsList.find(t => t.slug === tslug);
                              return (
                                <span key={tslug} className="trigger-chip-badge" style={{ borderColor: tag?.color }}>
                                  {tag ? tag.name_en : tslug}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className="combobox-arrow-badge">({productForm.tags.length}) ▼</span>
                      </button>

                      {showTagsDropdown && (
                        <div className="combobox-dropdown-card">
                          <div className="combobox-checklist">
                            {tagsList.map(tag => {
                              const isChecked = productForm.tags.includes(tag.slug);
                              return (
                                <label key={tag.slug} className="combobox-checkbox-option">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTagToggle(tag.slug)}
                                  />
                                  <span className="color-dot-indicator" style={{ backgroundColor: tag.color }}></span>
                                  <span className="option-text">{tag.name_en} / {tag.name_ar}</span>
                                </label>
                              );
                            })}
                          </div>
                          
                          {!isLocked && (
                            <div className="inline-create-tag-form">
                              <div className="form-divider-small">Create Custom Tag</div>
                              <input 
                                type="text"
                                placeholder="Name (EN)"
                                value={newTagForm.name_en}
                                onChange={e => setNewTagForm({ ...newTagForm, name_en: e.target.value })}
                              />
                              <input 
                                type="text"
                                placeholder="الاسم (AR)"
                                value={newTagForm.name_ar}
                                onChange={e => setNewTagForm({ ...newTagForm, name_ar: e.target.value })}
                                dir="rtl"
                              />
                              <div className="tag-color-input-row">
                                <label>Dot Color:</label>
                                <input 
                                  type="color"
                                  value={newTagForm.color}
                                  onChange={e => setNewTagForm({ ...newTagForm, color: e.target.value })}
                                />
                              </div>
                              <button 
                                type="button" 
                                className="btn-add-primary btn-small-tag"
                                onClick={handleCreateCustomTag}
                                disabled={creatingCustomTag}
                              >
                                {creatingCustomTag ? 'Adding...' : '+ Create Tag'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Image</label>
                  {isLocked ? (
                    <div className="product-image-box-preview">
                      {productImagePreview ? <img src={productImagePreview} alt="Preview" /> : <span>No Image Selected</span>}
                    </div>
                  ) : (
                    <FileInput
                      id="product-image-upload"
                      currentUrl={productImagePreview}
                      onFile={handleProductImageChange}
                      uploading={productImageUploading}
                    />
                  )}
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={productForm.is_available} 
                      onChange={e => setProductForm({ ...productForm, is_available: e.target.checked })} 
                    />
                    <span>Product is Available for customers</span>
                  </label>
                </div>
              </fieldset>

              <footer className="modal-footer-btn-row">
                {!isLocked && (
                  <button type="submit" className="btn-modal-submit" disabled={saveLoading || isAnyUploading}>
                    {isAnyUploading ? 'Uploading...' : (saveLoading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product'))}
                  </button>
                )}
                <button type="button" className="btn-modal-cancel" onClick={() => setShowProductModal(false)} disabled={isAnyUploading}>
                  {isLocked ? 'Close' : 'Cancel'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
