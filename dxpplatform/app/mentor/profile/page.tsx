"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { User, Briefcase, BookOpen, Link2, Save, CheckCircle } from "lucide-react";

type Profile = {
  name: string;
  email: string;
  phone_number: string;
  company: string;
  job_title: string;
  bio: string;
  years_of_experience: number | "";
  linkedin_url: string;
  expertise_areas: string[];
};

export default function MentorProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    phone_number: "",
    company: "",
    job_title: "",
    bio: "",
    years_of_experience: "",
    linkedin_url: "",
    expertise_areas: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const user = await getCurrentUser();
      if (!user || user.role !== "mentor") return;
      setUserId(user.id);

      const [{ data: u }, { data: mp }] = await Promise.all([
        supabase.from("user").select("name, email, phone_number").eq("id", user.id).single(),
        supabase
          .from("mentor_profile")
          .select("company, job_title, bio, years_of_experience, linkedin_url, expertise_areas")
          .eq("id", user.id)
          .single(),
      ]);

      if (u) {
        setProfile((prev) => ({
          ...prev,
          name: u.name ?? "",
          email: u.email ?? "",
          phone_number: u.phone_number ?? "",
        }));
      }
      if (mp) {
        setProfile((prev) => ({
          ...prev,
          company: mp.company ?? "",
          job_title: mp.job_title ?? "",
          bio: mp.bio ?? "",
          years_of_experience: mp.years_of_experience ?? "",
          linkedin_url: mp.linkedin_url ?? "",
          expertise_areas: mp.expertise_areas ?? [],
        }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    const supabase = createClient();
    setSaving(true);

    await Promise.all([
      supabase
        .from("user")
        .update({ name: profile.name, phone_number: profile.phone_number })
        .eq("id", userId),
      supabase.from("mentor_profile").upsert(
        {
          id: userId,
          company: profile.company,
          job_title: profile.job_title,
          bio: profile.bio,
          years_of_experience: profile.years_of_experience || null,
          linkedin_url: profile.linkedin_url,
          expertise_areas: profile.expertise_areas,
        },
        { onConflict: "id" }
      ),
    ]);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addExpertise = () => {
    const trimmed = expertiseInput.trim();
    if (trimmed && !profile.expertise_areas.includes(trimmed)) {
      setProfile((p) => ({ ...p, expertise_areas: [...p.expertise_areas, trimmed] }));
      setExpertiseInput("");
    }
  };

  const removeExpertise = (area: string) => {
    setProfile((p) => ({
      ...p,
      expertise_areas: p.expertise_areas.filter((a) => a !== area),
    }));
  };

  const field = (
    label: string,
    key: keyof Profile,
    placeholder?: string,
    type = "text"
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={profile[key] as string}
        onChange={(e) =>
          setProfile((p) => ({ ...p, [key]: e.target.value }))
        }
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-300"
      />
    </div>
  );

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "M";

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-1/3 mb-6" />
        <div className="h-48 bg-gray-100 rounded-2xl mb-4" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white text-xl font-bold flex items-center justify-center">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.name || "Your Profile"}</h1>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Personal info */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
          </div>
          <div className="space-y-4">
            {field("Full Name", "name", "Dr. Your Name")}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full text-sm border border-gray-100 bg-gray-50 text-gray-400 rounded-xl px-3 py-2.5 cursor-not-allowed"
              />
            </div>
            {field("Phone Number", "phone_number", "+60 12-345 6789", "tel")}
          </div>
        </section>

        {/* Professional info */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Professional Details</h2>
          </div>
          <div className="space-y-4">
            {field("Institution / Company", "company", "Universiti Malaya")}
            {field("Job Title", "job_title", "Senior Lecturer")}
            {field("Years of Experience", "years_of_experience", "15", "number")}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={profile.linkedin_url}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, linkedin_url: e.target.value }))
                  }
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-300"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Expertise */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Expertise Areas</h2>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g. Data Analytics, AI Tools"
              value={expertiseInput}
              onChange={(e) => setExpertiseInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpertise()}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-300"
            />
            <button
              onClick={addExpertise}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
          </div>
          {profile.expertise_areas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.expertise_areas.map((area) => (
                <span
                  key={area}
                  className="flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1"
                >
                  {area}
                  <button
                    onClick={() => removeExpertise(area)}
                    className="text-indigo-400 hover:text-indigo-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Bio */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
          <textarea
            rows={4}
            placeholder="Brief professional bio..."
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-300"
          />
        </section>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors ${
            saved
              ? "bg-emerald-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          } disabled:opacity-60`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : saving ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
