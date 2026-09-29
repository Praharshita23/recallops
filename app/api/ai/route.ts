import { NextResponse } from "next/server";

type AIAnalysis = {
  category: string;
  summary: string;
  keywords: string[];
  priority: "Low" | "Medium" | "High";
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GROQ_API_KEY is missing from .env.local",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const title = String(body?.title ?? "").trim();
    const content = String(body?.content ?? "").trim();

    if (!title && !content) {
      return NextResponse.json(
        {
          success: false,
          error: "Title or content is required.",
        },
        { status: 400 }
      );
    }

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content:
                "You are a structured information extraction API. You MUST return exactly one JSON object matching the provided schema. Never put labels such as Category, Summary, Keywords, or Priority inside another field.",
            },

            {
              role: "user",
              content: `
Analyze this personal recall.

TITLE:
${title}

CONTENT:
${content}

Return exactly these four fields:

category:
A short useful category such as Study, Programming, AI, Work, Personal, Project, Health, Finance, College, Career, or Other.

summary:
ONLY one short plain-English sentence describing what should be remembered.
Do NOT include the words Category, Keywords, or Priority in this field.
Do NOT use markdown.
Do NOT use **.
Do NOT include multiple fields in the summary.

keywords:
An array containing 3 to 6 short keywords.

priority:
Exactly one of:
Low
Medium
High
`,
            },
          ],

          response_format: {
            type: "json_schema",

            json_schema: {
              name: "recall_analysis",

              strict: true,

              schema: {
                type: "object",

                properties: {
                  category: {
                    type: "string",
                  },

                  summary: {
                    type: "string",
                  },

                  keywords: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },

                  priority: {
                    type: "string",
                    enum: ["Low", "Medium", "High"],
                  },
                },

                required: [
                  "category",
                  "summary",
                  "keywords",
                  "priority",
                ],

                additionalProperties: false,
              },
            },
          },

          reasoning_effort: "low",

          max_completion_tokens: 300,
        }),
      }
    );

    const responseText = await groqResponse.text();

    console.log("GROQ STATUS:", groqResponse.status);
    console.log("GROQ RESPONSE:", responseText);

    let groqData: any;

    try {
      groqData = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Groq returned invalid JSON. HTTP ${groqResponse.status}`,
          raw: responseText,
        },
        { status: 502 }
      );
    }

    if (!groqResponse.ok) {
      console.error("GROQ ERROR:", groqData);

      return NextResponse.json(
        {
          success: false,
          error:
            groqData?.error?.message ||
            `Groq request failed with HTTP ${groqResponse.status}`,
        },
        { status: 502 }
      );
    }

    const rawContent =
      groqData?.choices?.[0]?.message?.content;

    console.log("MODEL CONTENT:", rawContent);

    if (!rawContent) {
      return NextResponse.json(
        {
          success: false,
          error: "Groq returned no AI content.",
        },
        { status: 502 }
      );
    }

    let analysis: AIAnalysis;

    try {
      analysis = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Groq returned malformed analysis JSON.",
          raw: rawContent,
        },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // SAFETY VALIDATION
    // --------------------------------------------------

    if (
      typeof analysis.category !== "string" ||
      typeof analysis.summary !== "string" ||
      !Array.isArray(analysis.keywords) ||
      !["Low", "Medium", "High"].includes(
        analysis.priority
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "AI response did not match expected structure.",
          raw: analysis,
        },
        { status: 502 }
      );
    }

    // Clean the response before sending it to frontend
    analysis.category = analysis.category.trim();

    analysis.summary = analysis.summary
      .replace(/\*\*/g, "")
      .trim();

    analysis.keywords = analysis.keywords
      .filter(
        (keyword): keyword is string =>
          typeof keyword === "string"
      )
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 6);

    return NextResponse.json(
      {
        success: true,
        analysis,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/ai ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze recall.",
      },
      { status: 500 }
    );
  }
}