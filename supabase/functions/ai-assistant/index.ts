import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MCGILL_CONTEXT = `
## McGill University — Key Knowledge

**Campus & Buildings**
- Adams Building (ARTS) — Arts faculty lectures
- Leacock Building — Social sciences, large lecture halls
- Trottier Building (TROT) — Engineering & Computer Science
- Burnside Hall — Math & Stats
- McLennan Library / Redpath Library — Main study spots, open late
- Maass Chemistry Building — Chemistry labs
- Wong Building — Physics & Engineering labs
- Strathcona Anatomy & Dentistry Building
- SSMU Building (Shatner) — Student union, clubs, food court, Gerts bar
- Bronfman Building — Desautels Faculty of Management
- Stewart Biology Building — Life sciences
- McIntyre Medical Building — Medicine faculty

**Key Student Platforms**
- **Minerva** (minerva.mcgill.ca) — Course registration, grades, financial aid, unofficial transcripts
- **myCourses** (mycourses.mcgill.ca) — Course materials, assignments, grades per course
- **uAchieve** — Degree audit tool, check graduation requirements
- **Workday** — HR/payroll for student jobs on campus
- **McGill Visual Schedule Builder** — Plan your course schedule before registering

**Student Services**
- **OSS** (Office for Students with Disabilities) — Accommodations, exam deferrals
- **Wellness Hub** — Mental health counselling, psychiatry, wellness resources
- **CaPS** (Career Planning Service) — Résumé help, job postings, interview prep
- **ISS** (International Student Services) — Immigration, study permits, cultural support
- **Writing Centre** — Free 1-on-1 writing help for any course
- **Math Help Desk** — Free drop-in tutoring for first-year math
- **IT Help Desk** — Technical support, McGill WiFi, Microsoft 365
- **Registrar's Office** — Enrollment verification, transcripts, exam schedules
- **Financial Aid & Awards** — Bursaries, scholarships, OSAP/AFE

**Academic System**
- Credits: most courses are 3 credits; full-time = 12+ credits per semester
- GPA scale: 4.0 system (A = 4.0, A- = 3.7, B+ = 3.3, etc.)
- Passing grade: D (50%) but many programs require C or higher
- Add/Drop period: first ~10 days of semester with no academic penalty
- Withdrawal (W): after add/drop until ~week 10, no academic penalty but appears on transcript
- DNE (Did Not Enter): withdraw before attending, no record at all
- Supplemental exams: available for some courses if you fail (check course outline)
- uApply: graduate/professional school applications through McGill

**Important Academic Calendar Notes**
- Fall semester: early September to late April (with December finals)
- Winter semester: January to April (with April finals)
- Course registration opens by year level — U2/U3 first, then U1

**SSMU & Campus Life**
- SSMU (Students' Society of McGill University) — student government, runs clubs & services
- 200+ clubs across arts, culture, sports, academics, and professional development
- Club registration happens at the Activities Night / Clubs Fair at start of semester
- Gerts — the campus pub in the Shatner building, open to all students 18+
- Frosh Week — orientation week at start of September for new students

**Montreal Life Tips**
- STM metro: McGill station (Green line) is right on campus; Peel station nearby
- OPUS card: load monthly student pass (~$57/month, cheapest transit option)
- Montreal winters are cold — budget for a real winter jacket
- Food: The Main (St-Laurent Blvd), Mile-End, NDG are popular student neighborhoods
- Cheap eats on campus: Shatner building food court, Café Depot, various food trucks
- Student discounts: always carry your McGill ID — cinemas, restaurants, software

**Common First-Year Courses**
- MATH 141 (Calculus 2), MATH 133 (Linear Algebra)
- COMP 202 (Foundations of Programming), COMP 250 (Data Structures)
- CHEM 110/120 (General Chemistry)
- PHYS 101/142 (Introductory Physics)
- BIOL 112 (Cell & Molecular Biology)
- ECON 208/209 (Micro/Macroeconomics)
- POLI 211, SOCI 210 — popular Arts electives
- ENGL 224 — Academic writing (required for many programs)
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle();

    if (!(profile as any)?.is_premium) {
      return new Response(JSON.stringify({ error: "Premium required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: prefs } = await supabaseAdmin
      .from("user_preferences")
      .select("interest_name")
      .eq("user_id", user.id);

    const interests =
      (prefs ?? []).map((p: any) => p.interest_name).filter(Boolean).join(", ") || "not specified";

    const now = new Date().toISOString();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabaseAdmin
      .from("events")
      .select("title, date, location, description, organization, event_type, tags")
      .gte("date", now)
      .lte("date", in30Days)
      .order("date", { ascending: true })
      .limit(30);

    const eventsText =
      (events ?? []).length > 0
        ? (events ?? [])
            .map((e: any) => {
              const date = e.date
                ? new Date(e.date).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })
                : "TBD";
              return `• **${e.title}** — ${date}${e.location ? ` @ ${e.location}` : ""}${e.organization ? ` (by ${e.organization})` : ""}${e.description ? `\n  ${e.description.slice(0, 150)}` : ""}`;
            })
            .join("\n\n")
        : "No upcoming events in the next 30 days.";

    const systemPrompt = `You are **Vybin AI** — the smartest student assistant for McGill University in Montreal. You know everything about McGill campus life, academics, services, and events. You're like a brilliant upper-year student who has done everything and knows everyone.

**Today's date:** ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

**This student's interests:** ${interests}

---

${MCGILL_CONTEXT}

---

**Upcoming campus events (next 30 days):**
${eventsText}

---

**How to respond:**
- Use markdown formatting — **bold** for important terms, bullet lists for multiple items, headers when organizing longer answers
- Be genuinely helpful and specific — reference actual McGill buildings, services, and platforms by name
- For event recommendations, pull from the events list above and mention specific names and dates
- Keep it conversational but smart — like a knowledgeable friend, not a corporate chatbot
- If you don't know something specific (like a professor's office hours or a specific deadline), say so and point them to the right resource (Minerva, myCourses, department office, etc.)
- For academic stress or mental health topics, always mention the Wellness Hub warmly
- Responses should be as long as needed — short for simple questions, thorough for complex ones`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text ?? "Sorry, I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ai-assistant error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
