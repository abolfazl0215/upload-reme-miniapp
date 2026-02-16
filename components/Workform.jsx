"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function WorkerForm() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    phone: "",
    whatsapp: "",
    telegramUsername: "",
    region: "",
    district: "",
    specialty: "",
    experience: "",
    description: "",
    currentlyInArmenia: "yes",
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const armenianRegions = [
    "Yerevan",
    "Aragatsotn",
    "Ararat",
    "Armavir",
    "Gegharkunik",
    "Kotayk",
    "Lori",
    "Shirak",
    "Syunik",
    "Tavush",
    "Vayots Dzor",
  ];

  const yerevanDistricts = [
    "Ajapnyak",
    "Arabkir",
    "Avan",
    "Davtashen",
    "Erebuni",
    "Kentron",
    "Malatia-Sebastia",
    "Nor Nork",
    "Nork-Marash",
    "Nubarashen",
    "Shengavit",
    "Zeytun",
  ];

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      //   tg.expand();

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTelegramUser(user);
        // Auto-fill telegram username if available
        if (user.username) {
          setFormData((prev) => ({
            ...prev,
            telegramUsername: user.username,
          }));
        }
      }

      tg.MainButton.setText("ارسال فرم");
      tg.MainButton.color = "#D97706";
      tg.MainButton.textColor = "#FFFFFF";
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset district when region changes and it's not Yerevan
    if (name === "region" && value !== "Yerevan") {
      setFormData((prev) => ({ ...prev, district: "" }));
    }

    // Reset region and district when user changes Armenia status to "no"
    if (name === "currentlyInArmenia" && value === "no") {
      setFormData((prev) => ({ ...prev, region: "", district: "" }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length + images.length > 6) {
      toast.error("حداکثر می‌توانید 6 تصویر بارگذاری کنید");
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`فایل ${file.name} بیش از 5 مگابایت است`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`فایل ${file.name} یک تصویر نیست`);
        return false;
      }
      return true;
    });

    setImages((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error("لطفاً نام و نام خانوادگی را وارد کنید");
      return false;
    }
    if (!formData.age || formData.age < 18 || formData.age > 70) {
      toast.error("سن باید بین 18 تا 70 سال باشد");
      return false;
    }

    // Only validate region/district if user is in Armenia
    if (formData.currentlyInArmenia === "yes") {
      if (!formData.region) {
        toast.error("لطفاً استان خود را انتخاب کنید");
        return false;
      }
      if (formData.region === "Yerevan" && !formData.district) {
        toast.error("لطفاً منطقه خود را انتخاب کنید");
        return false;
      }
    }

    if (!formData.specialty.trim()) {
      toast.error("لطفاً تخصص خود را وارد کنید");
      return false;
    }
    if (!formData.experience) {
      toast.error("لطفاً سابقه کاری خود را انتخاب کنید");
      return false;
    }

    // Only require images if user is in Armenia
    if (
      formData.currentlyInArmenia === "yes" &&
      images.length === 0
    ) {
      toast.error(
        "لطفاً حداقل یک تصویر از نمونه کارهای خود بارگذاری کنید",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!telegramUser?.id) {
      toast.error("خطا در شناسایی کاربر تلگرام");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("در حال ارسال اطلاعات...");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("telegramId", telegramUser.id);
      formDataToSend.append(
        "telegramUsername",
        formData.telegramUsername || telegramUser.username || "",
      );
      formDataToSend.append("fullName", formData.fullName);
      formDataToSend.append("age", formData.age);
      formDataToSend.append("phone", formData.phone || "");
      formDataToSend.append("whatsapp", formData.whatsapp || "");
      formDataToSend.append("region", formData.region);
      formDataToSend.append("district", formData.district || "");
      formDataToSend.append("specialty", formData.specialty);
      formDataToSend.append("experience", formData.experience);
      formDataToSend.append(
        "description",
        formData.description || "",
      );
      formDataToSend.append(
        "currentlyInArmenia",
        formData.currentlyInArmenia,
      );

      images.forEach((image) => {
        formDataToSend.append("images", image);
      });

      const response = await axios.post(
        `https://upload-resume-miniapp-back.onrender.com/api/workers/submit`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        },
      );

      toast.dismiss(toastId);
      toast.success("فرم شما با موفقیت ارسال شد!", {
        duration: 5000,
      });

      // Reset form
      setFormData({
        fullName: "",
        age: "",
        phone: "",
        whatsapp: "",
        telegramUsername: telegramUser?.username || "",
        region: "",
        district: "",
        specialty: "",
        experience: "",
        description: "",
        currentlyInArmenia: "yes",
      });
      setImages([]);
      setImagePreviews([]);

      setTimeout(() => {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.close();
        }
      }, 2000);
    } catch (error) {
      toast.dismiss(toastId);

      if (error.response?.status === 429) {
        toast.error(
          "شما قبلاً فرم ارسال کرده‌اید. لطفاً 10 دقیقه دیگر تلاش کنید.",
          {
            duration: 6000,
          },
        );
      } else if (error.response?.status === 400) {
        toast.error(
          error.response.data.message ||
            "اطلاعات وارد شده نامعتبر است",
        );
      } else if (error.code === "ECONNABORTED") {
        toast.error(
          "زمان ارسال به پایان رسید. لطفاً دوباره تلاش کنید",
        );
      } else if (!error.response) {
        toast.error("خطا در برقراری ارتباط با سرور");
      } else {
        toast.error("خطا در ارسال فرم. لطفاً دوباره تلاش کنید");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50 p-4 md:p-6 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-amber-200/20 rounded-full blur-3xl -top-20 -right-20 animate-pulse"
          style={{ animationDuration: "4s" }}></div>
        <div
          className="absolute w-80 h-80 bg-orange-200/20 rounded-full blur-3xl -bottom-20 -left-20 animate-pulse"
          style={{
            animationDuration: "6s",
            animationDelay: "1s",
          }}></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl p-8 md:p-10 mb-6 shadow-2xl shadow-amber-900/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

          <div className="relative flex items-center gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 md:w-10 md:h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-4xl font-bold text-white mb-1">
                فرم ثبت‌نام نیروی کار
              </h1>
              <p className="text-amber-50/90 text-sm md:text-base">
                ابوالفضل مختاری
              </p>
            </div>
          </div>
        </div>

        {/* Important Notice Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                اطلاعات مهم
              </h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="leading-relaxed">
                    <span className="font-bold">کارت اقامت:</span> پس
                    از 2 ماه کارکرد و تایید کارفرما، برای شما اقدام به
                    دریافت کارت اقامت می‌کنیم. هزینه‌های دولتی بر عهده
                    متقاضی خواهد بود.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="leading-relaxed">
                    <span className="font-bold">هزینه معرفی:</span>{" "}
                    هزینه معرفی به کار{" "}
                    <span className="font-bold text-blue-900">
                      10,000 درام
                    </span>{" "}
                    می‌باشد که پس از مشغول شدن به کار میتوانید پرداخت
                    کنید.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-stone-900/10 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
                <h2 className="text-lg font-bold text-stone-900">
                  اطلاعات شخصی
                </h2>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    نام و نام خانوادگی{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="علی احمدی"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    سن <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="25"
                    min="18"
                    max="70"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    شماره تماس
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="+374 XX XXX XXX"
                    disabled={loading}
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    شماره واتساپ
                  </label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="+98 XXX XXX XXXX"
                    disabled={loading}
                  />
                </div>

                {/* Telegram Username */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    آیدی تلگرام (Username)
                  </label>
                  <input
                    type="text"
                    name="telegramUsername"
                    value={formData.telegramUsername}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="@username"
                    disabled={loading}
                  />
                </div>

                {/* Currently in Armenia */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-3">
                    آیا در حال حاضر در ارمنستان هستید؟{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-stone-200 rounded-xl transition-all hover:border-amber-300 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                      <input
                        type="radio"
                        name="currentlyInArmenia"
                        value="yes"
                        checked={
                          formData.currentlyInArmenia === "yes"
                        }
                        onChange={handleInputChange}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                        disabled={loading}
                      />
                      <span className="text-stone-700 font-medium">
                        بله، در ارمنستان هستم
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-stone-200 rounded-xl transition-all hover:border-amber-300 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                      <input
                        type="radio"
                        name="currentlyInArmenia"
                        value="no"
                        checked={formData.currentlyInArmenia === "no"}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                        disabled={loading}
                      />
                      <span className="text-stone-700 font-medium">
                        خیر، در ارمنستان نیستم
                      </span>
                    </label>
                  </div>
                </div>

                {/* Region and District */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      استان{" "}
                      {formData.currentlyInArmenia === "yes" && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white cursor-pointer transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed appearance-none"
                      required={formData.currentlyInArmenia === "yes"}
                      disabled={
                        loading ||
                        formData.currentlyInArmenia === "no"
                      }>
                      <option value="">
                        {formData.currentlyInArmenia === "no"
                          ? "فقط برای افراد در ارمنستان"
                          : "انتخاب استان"}
                      </option>
                      {armenianRegions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      منطقه{" "}
                      {formData.region === "Yerevan" &&
                        formData.currentlyInArmenia === "yes" && (
                          <span className="text-red-500">*</span>
                        )}
                    </label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white cursor-pointer transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed appearance-none"
                      required={
                        formData.region === "Yerevan" &&
                        formData.currentlyInArmenia === "yes"
                      }
                      disabled={
                        loading ||
                        formData.region !== "Yerevan" ||
                        formData.currentlyInArmenia === "no"
                      }>
                      <option value="">
                        {formData.currentlyInArmenia === "no"
                          ? "فقط برای افراد در ارمنستان"
                          : formData.region === "Yerevan"
                            ? "انتخاب منطقه"
                            : "ابتدا ایروان را انتخاب کنید"}
                      </option>
                      {formData.region === "Yerevan" &&
                        yerevanDistricts.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
                <h2 className="text-lg font-bold text-stone-900">
                  اطلاعات شغلی
                </h2>
              </div>

              <div className="space-y-4">
                {/* Specialty - Input field */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    تخصص <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="مثال: بنّا، کارگر، نجار، برقکار، لوله‌کش، نقاش، جوشکار، کاشی‌کار و..."
                    required
                    disabled={loading}
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    سابقه کاری <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white cursor-pointer transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed appearance-none"
                    required
                    disabled={loading}>
                    <option value="">انتخاب سابقه کاری</option>
                    <option value="beginner">
                      تازه‌کار (کمتر از 1 سال)
                    </option>
                    <option value="junior">مبتدی (1-3 سال)</option>
                    <option value="intermediate">
                      متوسط (3-5 سال)
                    </option>
                    <option value="senior">حرفه‌ای (5-10 سال)</option>
                    <option value="expert">
                      خبره (بیش از 10 سال)
                    </option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    توضیحات تکمیلی
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-900 bg-white resize-none transition-all duration-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="در مورد مهارت‌ها، گواهینامه‌ها یا سایر اطلاعات مرتبط بنویسید..."
                    rows={4}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Work Samples Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
                <h2 className="text-lg font-bold text-stone-900">
                  نمونه کارها
                </h2>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  بارگذاری تصاویر{" "}
                  {/* {formData.currentlyInArmenia === "yes" && (
                    <span className="text-red-500">*</span>
                  )} */}
                  <span className="text-xs font-normal text-stone-500 mr-2">
                    (حداکثر 6 تصویر، هر کدام 5 مگابایت)
                  </span>
                </label>

                {formData.currentlyInArmenia === "no" && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      برای افرادی که در ارمنستان نیستند، بارگذاری
                      تصاویر الزامی نیست.
                    </p>
                  </div>
                )}

                <label className="relative block cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={loading || images.length >= 6}
                  />
                  <div
                    className={`flex items-center justify-center gap-3 px-6 py-8 border-2 border-dashed rounded-xl transition-all duration-200 ${
                      images.length >= 6
                        ? "border-stone-200 bg-stone-50 cursor-not-allowed"
                        : "border-amber-300 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-400"
                    }`}>
                    <svg
                      className="w-8 h-8 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="text-stone-900 font-semibold">
                        {images.length >= 6
                          ? "حداکثر تصاویر بارگذاری شد"
                          : "برای بارگذاری کلیک کنید"}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        {images.length}/6 تصویر بارگذاری شده
                      </p>
                    </div>
                  </div>
                </label>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={preview}
                          alt={`نمونه کار ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
                          disabled={loading}>
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium">
                          تصویر {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-base font-bold rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-amber-600/30 hover:shadow-xl hover:shadow-amber-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              disabled={loading}>
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  در حال ارسال...
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  ارسال فرم
                </>
              )}
            </button>
          </form>

          {/* User Info */}
          {telegramUser && (
            <div className="mt-6 pt-6 border-t border-stone-200 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full">
                <svg
                  className="w-4 h-4 text-amber-600"
                  fill="currentColor"
                  viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span className="text-sm font-semibold text-stone-700">
                  {telegramUser.first_name}{" "}
                  {telegramUser.last_name || ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-stone-500">
          <p>ابوالفضل مختاری © {new Date().getFullYear()}</p>
          <p className="mt-1">شریک قابل اعتماد شما در ارمنستان</p>
        </div>
      </div>
    </div>
  );
}
