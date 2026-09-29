"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Recall = {
  id: number;
  user_id?: string;
  created_at: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  source: string | null;
};

type AIResult = {
  category: string;
  summary: string;
  keywords: string[];
  priority: "Low" | "Medium" | "High";
};

type Reminder = {
  recallId: number;
  title: string;
  reminderAt: string;
  notified?: boolean;
};

/* =========================================================
   CONSTANTS
========================================================= */

const REMINDER_STORAGE_KEY = "recallops_reminders";

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Home() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* =======================================================
     AUTH
  ======================================================= */

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* =======================================================
     ADD FORM
  ======================================================= */

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState("");

  const [saving, setSaving] = useState(false);

  /* =======================================================
     AI
  ======================================================= */

  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiError, setAIError] = useState("");
  const [aiResult, setAIResult] = useState<AIResult | null>(null);

  /* =======================================================
     RECALLS
  ======================================================= */

  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loadingRecalls, setLoadingRecalls] = useState(false);

  /* =======================================================
     SEARCH
  ======================================================= */

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  /* =======================================================
     EDIT
  ======================================================= */

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSource, setEditSource] = useState("");

  const [updating, setUpdating] = useState(false);

  /* =======================================================
     DELETE
  ======================================================= */

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  /* =======================================================
     REFRESH
  ======================================================= */

  const [refreshing, setRefreshing] = useState(false);

  /* =======================================================
     REMINDERS
  ======================================================= */

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderDate, setReminderDate] = useState("");

  /* =======================================================
     LOAD REMINDERS FROM LOCAL STORAGE
  ======================================================= */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(REMINDER_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setReminders(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load reminders:",
        error
      );
    }
  }, []);

  /* =======================================================
     SAVE REMINDERS TO LOCAL STORAGE
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        REMINDER_STORAGE_KEY,
        JSON.stringify(reminders)
      );
    } catch (error) {
      console.error(
        "Failed to save reminders:",
        error
      );
    }
  }, [reminders]);

  /* =======================================================
     AUTH INITIALIZATION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        setAuthLoading(true);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Supabase session error:",
            error
          );
        }

        if (!mounted) return;

        setCurrentUser(session?.user ?? null);
      } catch (error) {
        console.error(
          "Authentication error:",
          error
        );

        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setCurrentUser(
          session?.user ?? null
        );
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     REDIRECT IF NOT LOGGED IN
  ======================================================= */

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.replace("/auth");
    }
  }, [
    authLoading,
    currentUser,
    router,
  ]);

  /* =======================================================
     LOAD RECALLS
  ======================================================= */

  async function loadRecalls(userId?: string) {
    const id =
      userId || currentUser?.id;

    if (!id) return;

    try {
      setLoadingRecalls(true);

      const {
        data,
        error,
      } = await supabase
        .from("recalls")
        .select(
          "id, user_id, created_at, title, content, category, tags, source"
        )
        .eq("user_id", id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Load recalls error:",
          error
        );

        alert(error.message);
        return;
      }

      setRecalls(
        (data || []) as Recall[]
      );
    } catch (error) {
      console.error(
        "Load recalls exception:",
        error
      );

      alert(
        "Failed to load recalls."
      );
    } finally {
      setLoadingRecalls(false);
    }
  }

  /* =======================================================
     LOAD AFTER AUTH
  ======================================================= */

  useEffect(() => {
    if (
      !authLoading &&
      currentUser?.id
    ) {
      loadRecalls(
        currentUser.id
      );
    }
  }, [
    authLoading,
    currentUser?.id,
  ]);

  /* =======================================================
     KEYBOARD SHORTCUT
  ======================================================= */

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      const target =
        event.target as HTMLElement | null;

      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (
        event.key === "/" &&
        !isTyping &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();

        searchInputRef.current?.focus();
      }

      if (
        event.key === "Escape" &&
        document.activeElement ===
          searchInputRef.current
      ) {
        setSearch("");

        searchInputRef.current?.blur();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        alert(error.message);
        return;
      }

      setCurrentUser(null);
      setRecalls([]);

      router.replace("/auth");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }

  /* =======================================================
     AI JSON PARSER
  ======================================================= */

  function parseAIText(
    text: string
  ): any | null {
    if (
      !text ||
      typeof text !== "string"
    ) {
      return null;
    }

    const cleaned =
      text
        .trim()
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/i,
          ""
        )
        .replace(
          /\s*```$/i,
          ""
        )
        .trim();

    try {
      return JSON.parse(cleaned);
    } catch {}

    const firstBrace =
      cleaned.indexOf("{");

    const lastBrace =
      cleaned.lastIndexOf("}");

    if (
      firstBrace !== -1 &&
      lastBrace !== -1 &&
      lastBrace > firstBrace
    ) {
      try {
        return JSON.parse(
          cleaned.slice(
            firstBrace,
            lastBrace + 1
          )
        );
      } catch {}
    }

    return null;
  }

  /* =======================================================
     NORMALIZE AI RESULT
  ======================================================= */

  function normalizeAIResult(
    value: any
  ): AIResult | null {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return null;
    }

    const normalizedCategory =
      typeof value.category ===
        "string" &&
      value.category.trim()
        ? value.category.trim()
        : "General";

    const normalizedSummary =
      typeof value.summary ===
        "string" &&
      value.summary.trim()
        ? value.summary.trim()
        : "No summary generated.";

    const normalizedKeywords =
      Array.isArray(value.keywords)
        ? value.keywords
            .filter(
              (
                item: unknown
              ): item is string =>
                typeof item ===
                  "string" &&
                item.trim().length > 0
            )
            .map(
              (item: string) =>
                item.trim()
            )
            .slice(0, 8)
        : [];

    const priority =
      value.priority === "High" ||
      value.priority === "Medium" ||
      value.priority === "Low"
        ? value.priority
        : "Low";

    return {
      category:
        normalizedCategory,

      summary:
        normalizedSummary,

      keywords:
        normalizedKeywords,

      priority,
    };
  }

  /* =======================================================
     ANALYZE WITH AI
  ======================================================= */

  async function handleAnalyzeAI() {
    setAIError("");
    setAIResult(null);

    if (!title.trim()) {
      setAIError(
        "Please enter a recall title first."
      );

      return;
    }

    if (!content.trim()) {
      setAIError(
        "Please enter recall content first."
      );

      return;
    }

    try {
      setAnalyzingAI(true);

      const response =
        await fetch("/api/ai", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
          }),
        });

      const responseText =
        await response.text();

      console.log(
        "AI STATUS:",
        response.status
      );

      console.log(
        "AI RESPONSE:",
        responseText
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType
          .toLowerCase()
          .includes(
            "application/json"
          )
      ) {
        setAIError(
          `AI route returned non-JSON data (HTTP ${response.status}).`
        );

        return;
      }

      let result: any;

      try {
        result =
          JSON.parse(
            responseText
          );
      } catch {
        setAIError(
          "AI route returned invalid JSON."
        );

        return;
      }

      if (!response.ok) {
        setAIError(
          result?.error ||
            `AI analysis failed (HTTP ${response.status}).`
        );

        return;
      }

      let analysis =
        result?.analysis;

      if (
        !analysis &&
        result?.data
      ) {
        analysis =
          result.data.analysis ||
          result.data;
      }

      if (
        typeof analysis ===
        "string"
      ) {
        analysis =
          parseAIText(
            analysis
          );
      }

      if (!analysis) {
        analysis =
          parseAIText(
            result?.response ||
              result?.content ||
              ""
          );
      }

      const normalized =
        normalizeAIResult(
          analysis
        );

      if (!normalized) {
        setAIError(
          "AI responded, but the result format was invalid."
        );

        return;
      }

      setAIResult(normalized);

      // Automatically fill category
      setCategory(
        normalized.category
      );

      // Automatically fill tags
      setTags(
        normalized.keywords.join(
          ", "
        )
      );
    } catch (error) {
      console.error(
        "AI request error:",
        error
      );

      setAIError(
        error instanceof Error
          ? error.message
          : "Could not connect to the AI service."
      );
    } finally {
      setAnalyzingAI(false);
    }
  }

  /* =======================================================
     ADD RECALL
  ======================================================= */

  async function handleAddRecall() {
    if (!currentUser) {
      router.replace("/auth");
      return;
    }

    if (!title.trim()) {
      alert(
        "Please enter a recall title."
      );

      return;
    }

    if (!content.trim()) {
      alert(
        "Please enter what you want to remember."
      );

      return;
    }

    try {
      setSaving(true);

      const tagArray =
        tags
          .split(",")
          .map(
            (tag) =>
              tag.trim()
          )
          .filter(Boolean);

      const {
        data,
        error,
      } = await supabase
        .from("recalls")
        .insert({
          user_id:
            currentUser.id,

          title:
            title.trim(),

          content:
            content.trim(),

          category:
            category.trim() ||
            "General",

          tags:
            tagArray,

          source:
            source.trim() ||
            null,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Add recall error:",
          error
        );

        alert(error.message);
        return;
      }

      /*
        Create reminder only AFTER
        the recall exists.
      */

      if (
        reminderDate &&
        data?.id
      ) {
        setReminders(
          (previous) => [
            ...previous.filter(
              (item) =>
                item.recallId !==
                data.id
            ),

            {
              recallId:
                data.id,

              title:
                title.trim(),

              reminderAt:
                reminderDate,

              notified: false,
            },
          ]
        );
      }

      resetAddForm();

      await loadRecalls(
        currentUser.id
      );
    } catch (error) {
      console.error(
        "Add recall exception:",
        error
      );

      alert(
        "Failed to add recall."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     RESET FORM
  ======================================================= */

  function resetAddForm() {
    setTitle("");
    setContent("");
    setCategory("");
    setTags("");
    setSource("");
    setReminderDate("");

    setAIResult(null);
    setAIError("");
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function startEdit(
    recall: Recall
  ) {
    setEditingId(
      recall.id
    );

    setEditTitle(
      recall.title || ""
    );

    setEditContent(
      recall.content || ""
    );

    setEditCategory(
      recall.category || ""
    );

    setEditTags(
      Array.isArray(
        recall.tags
      )
        ? recall.tags.join(
            ", "
          )
        : ""
    );

    setEditSource(
      recall.source || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     CANCEL EDIT
  ======================================================= */

  function cancelEdit() {
    setEditingId(null);

    setEditTitle("");
    setEditContent("");
    setEditCategory("");
    setEditTags("");
    setEditSource("");
  }

  /* =======================================================
     UPDATE
  ======================================================= */

  async function handleUpdateRecall() {
    if (
      !currentUser ||
      editingId === null
    ) {
      return;
    }

    if (
      !editTitle.trim() ||
      !editContent.trim()
    ) {
      alert(
        "Title and content are required."
      );

      return;
    }

    try {
      setUpdating(true);

      const tagArray =
        editTags
          .split(",")
          .map(
            (tag) =>
              tag.trim()
          )
          .filter(Boolean);

      const { error } =
        await supabase
          .from("recalls")
          .update({
            title:
              editTitle.trim(),

            content:
              editContent.trim(),

            category:
              editCategory.trim() ||
              "General",

            tags:
              tagArray,

            source:
              editSource.trim() ||
              null,
          })
          .eq(
            "id",
            editingId
          )
          .eq(
            "user_id",
            currentUser.id
          );

      if (error) {
        console.error(
          "Update error:",
          error
        );

        alert(error.message);
        return;
      }

      cancelEdit();

      await loadRecalls(
        currentUser.id
      );
    } catch (error) {
      console.error(
        "Update exception:",
        error
      );

      alert(
        "Failed to update recall."
      );
    } finally {
      setUpdating(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDeleteRecall(
    id: number
  ) {
    if (!currentUser) {
      router.replace("/auth");
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this recall?"
      );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const { error } =
        await supabase
          .from("recalls")
          .delete()
          .eq(
            "id",
            id
          )
          .eq(
            "user_id",
            currentUser.id
          );

      if (error) {
        console.error(
          "Delete error:",
          error
        );

        alert(error.message);
        return;
      }

      // Remove related reminder
      setReminders(
        (previous) =>
          previous.filter(
            (item) =>
              item.recallId !== id
          )
      );

      setRecalls(
        (previous) =>
          previous.filter(
            (recall) =>
              recall.id !== id
          )
      );
    } catch (error) {
      console.error(
        "Delete exception:",
        error
      );

      alert(
        "Failed to delete recall."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =======================================================
     REFRESH
  ======================================================= */

  async function handleRefresh() {
    if (!currentUser) return;

    try {
      setRefreshing(true);

      await loadRecalls(
        currentUser.id
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* =======================================================
     REQUEST NOTIFICATIONS
  ======================================================= */

  async function enableNotifications() {
    if (
      typeof window ===
        "undefined" ||
      !("Notification" in window)
    ) {
      alert(
        "Browser notifications are not supported."
      );

      return;
    }

    const permission =
      await Notification.requestPermission();

    if (
      permission === "granted"
    ) {
      alert(
        "Notifications enabled!"
      );
    } else {
      alert(
        "Notification permission was not granted."
      );
    }
  }

  /* =======================================================
     REMINDER CHECKER
  ======================================================= */

  useEffect(() => {
    function checkReminders() {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      const now =
        new Date().getTime();

      setReminders(
        (previous) =>
          previous.map(
            (reminder) => {
              if (
                reminder.notified
              ) {
                return reminder;
              }

              const reminderTime =
                new Date(
                  reminder.reminderAt
                ).getTime();

              if (
                Number.isNaN(
                  reminderTime
                )
              ) {
                return reminder;
              }

              if (
                reminderTime <=
                now
              ) {
                if (
                  "Notification" in
                    window &&
                  Notification.permission ===
                    "granted"
                ) {
                  new Notification(
                    "RecallOps Reminder",
                    {
                      body:
                        reminder.title,
                    }
                  );
                }

                return {
                  ...reminder,
                  notified: true,
                };
              }

              return reminder;
            }
          )
      );
    }

    checkReminders();

    const interval =
      window.setInterval(
        checkReminders,
        30000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories =
    useMemo(() => {
      const unique =
        new Set<string>();

      recalls.forEach(
        (recall) => {
          if (
            recall.category?.trim()
          ) {
            unique.add(
              recall.category.trim()
            );
          }
        }
      );

      return Array.from(
        unique
      ).sort();
    }, [recalls]);

  /* =======================================================
     SEARCH + FILTER
  ======================================================= */

  const filteredRecalls =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return recalls.filter(
        (recall) => {
          const title =
            recall.title?.toLowerCase() ||
            "";

          const content =
            recall.content?.toLowerCase() ||
            "";

          const category =
            recall.category?.toLowerCase() ||
            "";

          const source =
            recall.source?.toLowerCase() ||
            "";

          const tagsText =
            Array.isArray(
              recall.tags
            )
              ? recall.tags
                  .join(" ")
                  .toLowerCase()
              : "";

          const matchesSearch =
            !query ||
            title.includes(
              query
            ) ||
            content.includes(
              query
            ) ||
            category.includes(
              query
            ) ||
            tagsText.includes(
              query
            ) ||
            source.includes(
              query
            );

          const matchesCategory =
            selectedCategory ===
              "All" ||
            recall.category ===
              selectedCategory;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      recalls,
      search,
      selectedCategory,
    ]);

  /* =======================================================
     STATS
  ======================================================= */

  const totalRecalls =
    recalls.length;

  const categoryCount =
    categories.length;

  const showingCount =
    filteredRecalls.length;

  const activeReminders =
    reminders.filter(
      (item) =>
        !item.notified
    ).length;

  /* =======================================================
     DATE FORMATTER
     IMPORTANT:
     Uses supplied date only.
     No Date.now() during render.
  ======================================================= */

  function formatDate(
    dateString: string
  ) {
    const date =
      new Date(
        dateString
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Unknown date";
    }

    return date
      .toISOString()
      .slice(0, 16)
      .replace(
        "T",
        " "
      );
  }

  /* =======================================================
     REMINDER HELPERS
  ======================================================= */

  function getReminder(
    recallId: number
  ) {
    return reminders.find(
      (item) =>
        item.recallId ===
        recallId
    );
  }

  function removeReminder(
    recallId: number
  ) {
    setReminders(
      (previous) =>
        previous.filter(
          (item) =>
            item.recallId !==
            recallId
        )
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (authLoading) {
    return (
      <main style={pageStyle}>
        <div
          style={loadingStyle}
        >
          Loading RecallOps...
        </div>
      </main>
    );
  }

  /* =======================================================
     NOT LOGGED IN
  ======================================================= */

  if (!currentUser) {
    return (
      <main style={pageStyle}>
        <div
          style={loadingStyle}
        >
          Redirecting to login...
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main style={pageStyle}>
      <div
        style={containerStyle}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          style={headerStyle}
        >
          <div>
            <h1
              style={mainTitleStyle}
            >
              RecallOps
            </h1>

            <p
              style={subtitleStyle}
            >
              Capture. Organize. Recall.
            </p>

            <p
              style={loggedInStyle}
            >
              Logged in as{" "}
              <strong>
                {currentUser.email}
              </strong>
            </p>
          </div>

          <button
            onClick={
              handleLogout
            }
            style={
              logoutButtonStyle
            }
          >
            Logout
          </button>
        </header>

        {/* =================================================
            STATS
        ================================================= */}

        <section
          style={statsGridStyle}
        >
          <div
            style={statCardStyle}
          >
            <div
              style={
                statNumberStyle
              }
            >
              {totalRecalls}
            </div>

            <div
              style={
                statLabelStyle
              }
            >
              Total Recalls
            </div>
          </div>

          <div
            style={statCardStyle}
          >
            <div
              style={
                statNumberStyle
              }
            >
              {categoryCount}
            </div>

            <div
              style={
                statLabelStyle
              }
            >
              Categories
            </div>
          </div>

          <div
            style={statCardStyle}
          >
            <div
              style={
                statNumberStyle
              }
            >
              {activeReminders}
            </div>

            <div
              style={
                statLabelStyle
              }
            >
              Active Reminders
            </div>
          </div>
        </section>

        {/* =================================================
            ADD / EDIT
        ================================================= */}

        <section
          style={formCardStyle}
        >
          <h2
            style={
              sectionTitleStyle
            }
          >
            {editingId !== null
              ? "Edit Recall"
              : "Add a Recall"}
          </h2>

          <p
            style={
              sectionSubtitleStyle
            }
          >
            {editingId !== null
              ? "Update your saved memory."
              : "Save something you want to remember."}
          </p>

          {/* TITLE */}

          <input
            value={
              editingId !== null
                ? editTitle
                : title
            }
            onChange={(event) => {
              if (
                editingId !== null
              ) {
                setEditTitle(
                  event.target.value
                );
              } else {
                setTitle(
                  event.target.value
                );
              }
            }}
            placeholder="Recall title"
            style={inputStyle}
          />

          {/* CONTENT */}

          <textarea
            value={
              editingId !== null
                ? editContent
                : content
            }
            onChange={(event) => {
              if (
                editingId !== null
              ) {
                setEditContent(
                  event.target.value
                );
              } else {
                setContent(
                  event.target.value
                );
              }
            }}
            placeholder="What do you want to remember?"
            rows={6}
            style={textareaStyle}
          />

          {/* AI */}

          {editingId === null && (
            <>
              <button
                onClick={
                  handleAnalyzeAI
                }
                disabled={
                  analyzingAI
                }
                style={{
                  ...aiButtonStyle,
                  opacity:
                    analyzingAI
                      ? 0.6
                      : 1,
                }}
              >
                {analyzingAI
                  ? "✨ Analyzing..."
                  : "✨ Analyze with AI"}
              </button>

              {aiError && (
                <div
                  style={
                    errorBoxStyle
                  }
                >
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div
                  style={
                    aiResultBoxStyle
                  }
                >
                  <div
                    style={
                      aiResultHeaderStyle
                    }
                  >
                    <strong>
                      AI Analysis
                    </strong>

                    <span
                      style={{
                        ...priorityBadgeStyle,

                        ...(aiResult.priority ===
                        "High"
                          ? highPriorityStyle
                          : aiResult.priority ===
                            "Medium"
                          ? mediumPriorityStyle
                          : lowPriorityStyle),
                      }}
                    >
                      {
                        aiResult.priority
                      }{" "}
                      Priority
                    </span>
                  </div>

                  <div
                    style={
                      aiResultRowStyle
                    }
                  >
                    <strong>
                      Category:
                    </strong>

                    <span>
                      {
                        aiResult.category
                      }
                    </span>
                  </div>

                  <div
                    style={
                      aiResultRowStyle
                    }
                  >
                    <strong>
                      Summary:
                    </strong>

                    <span>
                      {
                        aiResult.summary
                      }
                    </span>
                  </div>

                  <div
                    style={
                      aiResultRowStyle
                    }
                  >
                    <strong>
                      Keywords:
                    </strong>

                    <div
                      style={
                        keywordContainerStyle
                      }
                    >
                      {aiResult.keywords.map(
                        (
                          keyword,
                          index
                        ) => (
                          <span
                            key={`${keyword}-${index}`}
                            style={
                              keywordStyle
                            }
                          >
                            {keyword}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* CATEGORY */}

          <input
            value={
              editingId !== null
                ? editCategory
                : category
            }
            onChange={(event) => {
              if (
                editingId !== null
              ) {
                setEditCategory(
                  event.target.value
                );
              } else {
                setCategory(
                  event.target.value
                );
              }
            }}
            placeholder="Category (e.g. Study, Work, Personal)"
            style={inputStyle}
          />

          {/* TAGS */}

          <input
            value={
              editingId !== null
                ? editTags
                : tags
            }
            onChange={(event) => {
              if (
                editingId !== null
              ) {
                setEditTags(
                  event.target.value
                );
              } else {
                setTags(
                  event.target.value
                );
              }
            }}
            placeholder="Tags (e.g. AI, Java, DSA)"
            style={inputStyle}
          />

          {/* SOURCE */}

          <input
            value={
              editingId !== null
                ? editSource
                : source
            }
            onChange={(event) => {
              if (
                editingId !== null
              ) {
                setEditSource(
                  event.target.value
                );
              } else {
                setSource(
                  event.target.value
                );
              }
            }}
            placeholder="Source (optional)"
            style={inputStyle}
          />

          {/* REMINDER */}

          {editingId === null && (
            <div
              style={
                reminderBoxStyle
              }
            >
              <div>
                <strong>
                  ⏰ Set a Reminder
                </strong>

                <p
                  style={
                    reminderHelpStyle
                  }
                >
                  Get a browser notification when this recall is due.
                </p>
              </div>

              <input
                type="datetime-local"
                value={
                  reminderDate
                }
                min={
                  typeof window !==
                  "undefined"
                    ? new Date()
                        .toISOString()
                        .slice(
                          0,
                          16
                        )
                    : undefined
                }
                onChange={(event) =>
                  setReminderDate(
                    event.target
                      .value
                  )
                }
                style={
                  dateInputStyle
                }
              />

              <button
                type="button"
                onClick={
                  enableNotifications
                }
                style={
                  notificationButtonStyle
                }
              >
                🔔 Enable Notifications
              </button>
            </div>
          )}

          {/* BUTTONS */}

          <div
            style={
              formButtonsStyle
            }
          >
            {editingId !== null ? (
              <>
                <button
                  onClick={
                    handleUpdateRecall
                  }
                  disabled={
                    updating
                  }
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      updating
                        ? 0.6
                        : 1,
                  }}
                >
                  {updating
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  onClick={
                    cancelEdit
                  }
                  disabled={
                    updating
                  }
                  style={
                    secondaryButtonStyle
                  }
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={
                  handleAddRecall
                }
                disabled={
                  saving
                }
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    saving
                      ? 0.6
                      : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "+ Add Recall"}
              </button>
            )}
          </div>
        </section>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section
          style={
            searchSectionStyle
          }
        >
          <div
            style={
              searchHeaderStyle
            }
          >
            <div>
              <h2
                style={
                  searchTitleStyle
                }
              >
                Find a Recall
              </h2>

              <p
                style={
                  searchSubtitleStyle
                }
              >
                Search through your memories instantly.
              </p>
            </div>

            <span
              style={
                shortcutStyle
              }
            >
              Press /
            </span>
          </div>

          <div
            style={
              searchRowStyle
            }
          >
            <div
              style={
                searchInputWrapperStyle
              }
            >
              <span
                style={
                  searchIconStyle
                }
              >
                🔎
              </span>

              <input
                ref={
                  searchInputRef
                }
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search recalls..."
                style={
                  searchInputStyle
                }
              />

              {search && (
                <button
                  onClick={() => {
                    setSearch("");

                    searchInputRef.current?.focus();
                  }}
                  style={
                    clearSearchButtonStyle
                  }
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={
                selectedCategory
              }
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value
                )
              }
              style={
                selectStyle
              }
            >
              <option value="All">
                All Categories
              </option>

              {categories.map(
                (item) => (
                  <option
                    value={item}
                    key={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <button
              onClick={
                handleRefresh
              }
              disabled={
                refreshing
              }
              style={
                refreshButtonStyle
              }
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>
          </div>

          <div
            style={
              searchInfoStyle
            }
          >
            {search ||
            selectedCategory !==
              "All" ? (
              <>
                Showing{" "}
                <strong>
                  {
                    showingCount
                  }
                </strong>{" "}
                of{" "}
                <strong>
                  {
                    totalRecalls
                  }
                </strong>{" "}
                recalls
              </>
            ) : (
              <>
                {
                  totalRecalls
                }{" "}
                recalls available
              </>
            )}
          </div>
        </section>

        {/* =================================================
            RECALLS
        ================================================= */}

        <section>
          <h2
            style={
              recallsHeadingStyle
            }
          >
            Your Recalls (
            {showingCount})
          </h2>

          {loadingRecalls ? (
            <div
              style={
                emptyStyle
              }
            >
              Loading recalls...
            </div>
          ) : filteredRecalls.length ===
            0 ? (
            <div
              style={
                emptyStyle
              }
            >
              {recalls.length ===
              0
                ? "You don't have any recalls yet."
                : "No recalls match your search."}
            </div>
          ) : (
            <div
              style={
                recallListStyle
              }
            >
              {filteredRecalls.map(
                (recall) => {
                  const reminder =
                    getReminder(
                      recall.id
                    );

                  return (
                    <article
                      key={
                        recall.id
                      }
                      style={
                        recallCardStyle
                      }
                    >
                      <div
                        style={
                          recallHeaderStyle
                        }
                      >
                        <div
                          style={{
                            flex: 1,
                          }}
                        >
                          <h3
                            style={
                              recallTitleStyle
                            }
                          >
                            {
                              recall.title
                            }
                          </h3>

                          {recall.category && (
                            <div
                              style={
                                categoryTextStyle
                              }
                            >
                              {
                                recall.category
                              }
                            </div>
                          )}
                        </div>

                        <div
                          style={
                            cardActionsStyle
                          }
                        >
                          <button
                            onClick={() =>
                              startEdit(
                                recall
                              )
                            }
                            style={
                              editButtonStyle
                            }
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteRecall(
                                recall.id
                              )
                            }
                            disabled={
                              deletingId ===
                              recall.id
                            }
                            style={
                              deleteButtonStyle
                            }
                          >
                            {deletingId ===
                            recall.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>

                      <p
                        style={
                          recallContentStyle
                        }
                      >
                        {
                          recall.content
                        }
                      </p>

                      {/* TAGS */}

                      {Array.isArray(
                        recall.tags
                      ) &&
                        recall.tags
                          .length >
                          0 && (
                          <div
                            style={
                              tagListStyle
                            }
                          >
                            {recall.tags.map(
                              (
                                tag,
                                index
                              ) => (
                                <span
                                  key={`${tag}-${index}`}
                                  style={
                                    tagStyle
                                  }
                                >
                                  {
                                    tag
                                  }
                                </span>
                              )
                            )}
                          </div>
                        )}

                      {/* REMINDER */}

                      {reminder && (
                        <div
                          style={
                            reminderCardStyle
                          }
                        >
                          <div>
                            <strong>
                              ⏰ Reminder
                            </strong>

                            <div
                              style={
                                reminderDateTextStyle
                              }
                            >
                              {reminder.notified
                                ? "Reminder delivered"
                                : `Due: ${formatDate(
                                    reminder.reminderAt
                                  )}`}
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              removeReminder(
                                recall.id
                              )
                            }
                            style={
                              removeReminderStyle
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* SOURCE */}

                      {recall.source && (
                        <div
                          style={
                            sourceStyle
                          }
                        >
                          Source:{" "}
                          {
                            recall.source
                          }
                        </div>
                      )}

                      <div
                        style={
                          dateStyle
                        }
                      >
                        Created{" "}
                        {formatDate(
                          recall.created_at
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   STYLES
============================================================ */

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#080808",
  color: "#f5f5f5",
  padding:
    "40px 20px 80px",
  boxSizing: "border-box",
};

const containerStyle: CSSProperties = {
  width: "100%",
  maxWidth: "1050px",
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "35px",
};

const mainTitleStyle: CSSProperties = {
  fontSize: "44px",
  fontWeight: 700,
  margin: 0,
  letterSpacing: "-1px",
};

const subtitleStyle: CSSProperties = {
  color: "#999",
  fontSize: "18px",
  marginTop: "8px",
  marginBottom: "15px",
};

const loggedInStyle: CSSProperties = {
  color: "#777",
  fontSize: "14px",
  margin: 0,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
  marginBottom: "30px",
};

const statCardStyle: CSSProperties = {
  background: "#111",
  border: "1px solid #292929",
  borderRadius: "12px",
  padding: "25px",
};

const statNumberStyle: CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  marginBottom: "8px",
};

const statLabelStyle: CSSProperties = {
  color: "#888",
  fontSize: "14px",
};

const formCardStyle: CSSProperties = {
  background: "#111",
  border: "1px solid #292929",
  borderRadius: "14px",
  padding: "26px",
  marginBottom: "32px",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  margin: 0,
};

const sectionSubtitleStyle: CSSProperties = {
  color: "#888",
  marginTop: "7px",
  marginBottom: "25px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#090909",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: "9px",
  padding: "16px 14px",
  fontSize: "15px",
  outline: "none",
  marginBottom: "14px",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "150px",
  fontFamily: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  background: "#fff",
  color: "#080808",
  border: "none",
  borderRadius: "8px",
  padding: "14px 20px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#181818",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "8px",
  padding: "14px 20px",
  fontSize: "15px",
  cursor: "pointer",
};

const logoutButtonStyle: CSSProperties = {
  background: "transparent",
  color: "#ddd",
  border: "1px solid #333",
  borderRadius: "8px",
  padding: "11px 16px",
  cursor: "pointer",
};

const aiButtonStyle: CSSProperties = {
  width: "100%",
  background: "#121212",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "9px",
  padding: "15px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  marginBottom: "14px",
};

const errorBoxStyle: CSSProperties = {
  background: "#2a1111",
  color: "#ff6b6b",
  border: "1px solid #713030",
  borderRadius: "8px",
  padding: "13px",
  marginBottom: "14px",
  fontSize: "14px",
};

const aiResultBoxStyle: CSSProperties = {
  background: "#151515",
  border: "1px solid #333",
  borderRadius: "10px",
  padding: "18px",
  marginBottom: "16px",
};

const aiResultHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "15px",
};

const aiResultRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "13px",
  color: "#bbb",
};

const priorityBadgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: 600,
};

const highPriorityStyle: CSSProperties = {
  background: "#401616",
  color: "#ff7777",
};

const mediumPriorityStyle: CSSProperties = {
  background: "#403616",
  color: "#ffd477",
};

const lowPriorityStyle: CSSProperties = {
  background: "#163d2a",
  color: "#76e3a7",
};

const keywordContainerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
};

const keywordStyle: CSSProperties = {
  background: "#292929",
  color: "#ccc",
  padding: "6px 10px",
  borderRadius: "20px",
  fontSize: "12px",
};

const formButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "4px",
};

const reminderBoxStyle: CSSProperties = {
  background: "#0d1511",
  border: "1px solid #214b35",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const reminderHelpStyle: CSSProperties = {
  color: "#777",
  fontSize: "13px",
  margin:
    "5px 0 0",
};

const dateInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#090909",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: "8px",
  padding: "12px",
};

const notificationButtonStyle: CSSProperties = {
  alignSelf: "flex-start",
  background: "#183d29",
  color: "#7ee2a8",
  border: "1px solid #285b3d",
  borderRadius: "7px",
  padding: "9px 13px",
  cursor: "pointer",
};

const searchSectionStyle: CSSProperties = {
  background: "#111",
  border: "1px solid #292929",
  borderRadius: "14px",
  padding: "22px",
  marginBottom: "28px",
};

const searchHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "15px",
  marginBottom: "18px",
};

const searchTitleStyle: CSSProperties = {
  fontSize: "21px",
  fontWeight: 600,
  margin: 0,
};

const searchSubtitleStyle: CSSProperties = {
  color: "#777",
  fontSize: "13px",
  margin:
    "6px 0 0",
};

const shortcutStyle: CSSProperties = {
  border: "1px solid #333",
  background: "#181818",
  color: "#888",
  padding: "6px 10px",
  borderRadius: "6px",
  fontSize: "12px",
};

const searchRowStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const searchInputWrapperStyle: CSSProperties = {
  flex: 1,
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const searchIconStyle: CSSProperties = {
  position: "absolute",
  left: "14px",
  fontSize: "15px",
  pointerEvents: "none",
};

const searchInputStyle: CSSProperties = {
  ...inputStyle,
  marginBottom: 0,
  paddingLeft: "42px",
  paddingRight: "42px",
};

const clearSearchButtonStyle: CSSProperties = {
  position: "absolute",
  right: "10px",
  background: "transparent",
  border: "none",
  color: "#777",
  cursor: "pointer",
  fontSize: "14px",
};

const selectStyle: CSSProperties = {
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: "9px",
  padding: "15px 14px",
  fontSize: "15px",
  minWidth: "180px",
};

const refreshButtonStyle: CSSProperties = {
  background: "#222",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: "8px",
  padding: "15px 17px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const searchInfoStyle: CSSProperties = {
  color: "#666",
  fontSize: "13px",
  marginTop: "14px",
};

const recallsHeadingStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  marginBottom: "18px",
};

const recallListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const recallCardStyle: CSSProperties = {
  background: "#111",
  border: "1px solid #292929",
  borderRadius: "14px",
  padding: "22px",
};

const recallHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "15px",
};

const recallTitleStyle: CSSProperties = {
  fontSize: "22px",
  fontWeight: 500,
  margin: 0,
};

const categoryTextStyle: CSSProperties = {
  color: "#999",
  fontSize: "14px",
  marginTop: "12px",
};

const cardActionsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const editButtonStyle: CSSProperties = {
  background: "transparent",
  color: "#ddd",
  border: "1px solid #444",
  borderRadius: "7px",
  padding: "9px 14px",
  cursor: "pointer",
};

const deleteButtonStyle: CSSProperties = {
  background: "transparent",
  color: "#ff7070",
  border: "1px solid #6b2929",
  borderRadius: "7px",
  padding: "9px 14px",
  cursor: "pointer",
};

const recallContentStyle: CSSProperties = {
  color: "#ccc",
  lineHeight: 1.7,
  marginTop: "20px",
  marginBottom: "17px",
  whiteSpace: "pre-wrap",
};

const tagListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "18px",
};

const tagStyle: CSSProperties = {
  background: "#292929",
  color: "#ccc",
  padding: "8px 12px",
  borderRadius: "20px",
  fontSize: "12px",
};

const reminderCardStyle: CSSProperties = {
  background: "#0d1511",
  border: "1px solid #214b35",
  borderRadius: "9px",
  padding: "12px 14px",
  marginBottom: "16px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "12px",
};

const reminderDateTextStyle: CSSProperties = {
  color: "#76c998",
  fontSize: "12px",
  marginTop: "5px",
};

const removeReminderStyle: CSSProperties = {
  background: "transparent",
  color: "#999",
  border: "1px solid #333",
  borderRadius: "6px",
  padding: "7px 10px",
  cursor: "pointer",
};

const sourceStyle: CSSProperties = {
  color: "#777",
  fontSize: "13px",
  marginBottom: "12px",
};

const dateStyle: CSSProperties = {
  color: "#666",
  fontSize: "12px",
};

const emptyStyle: CSSProperties = {
  background: "#111",
  border: "1px solid #292929",
  borderRadius: "12px",
  padding: "35px",
  color: "#777",
  textAlign: "center",
};

const loadingStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#aaa",
  fontSize: "18px",
};