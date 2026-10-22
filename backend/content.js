// SkillForge Academy's original, project-based curriculum. Each lesson includes a knowledge check.
module.exports = [
  {
    "slug": "python-programming",
    "title": "Python Programming: Zero to Real Applications",
    "summary": "Learn Python from first principles and build a tested expense tracker with files, functions and clean code.",
    "price": 1000,
    "lessons": [
      {
        "title": "Your first Python program",
        "body": "Python executes statements in order. Use `print(\"Habari, dunia!\")` to display text. Values have types: `str` for text, `int` for whole numbers, `float` for decimals and `bool` for True/False. Names should describe their purpose: `daily_sales = 1250`. Python is case-sensitive and indentation matters. Run small examples often; when an error appears, read the final line first and locate the line number. Practice: calculate the total cost of three notebooks costing KSh 85 each.",
        "quiz": [
          {
            "q": "What does `print(3 * 4)` display?",
            "o": [
              "7",
              "12",
              "34",
              "An error"
            ],
            "a": 1,
            "e": "Multiplication is evaluated before print displays the result."
          }
        ]
      },
      {
        "title": "Variables, types and input",
        "body": "Assignment with `=` stores a value in a name; `==` compares two values. `input()` always returns text, so convert numeric input with `int()` or `float()` before arithmetic. Example: `age = int(input(\"Age: \"))`. Use f-strings to format output: `f\"Total: KSh {total}\"`. Conversion can fail when a user types non-numeric text, so validate input in real applications. Practice: ask for item price and quantity and print the total.",
        "quiz": [
          {
            "q": "What type does `input()` return by default?",
            "o": [
              "Integer",
              "Boolean",
              "String",
              "Float"
            ],
            "a": 2,
            "e": "input() returns a string, even when the user types digits."
          }
        ]
      },
      {
        "title": "Conditions and boolean logic",
        "body": "Use `if`, `elif` and `else` to choose a path. Conditions use comparisons such as `>=`, `!=`, and equality `==`. Combine tests with `and`, `or` and `not`. Example: `if score >= 50: print(\"Pass\") else: print(\"Retry\")`. Keep branches readable and avoid deeply nested logic. Test boundary values: 49, 50 and 51. Practice: apply a delivery fee of KSh 0 for orders of at least 2000, otherwise KSh 150.",
        "quiz": [
          {
            "q": "Which operator means “both conditions must be true”?",
            "o": [
              "or",
              "and",
              "not",
              "=",
              ""
            ],
            "a": 1,
            "e": "and is true only when both expressions are true."
          }
        ]
      },
      {
        "title": "Loops and collections",
        "body": "A `for` loop repeats over a sequence; `range(1, 4)` produces 1, 2, 3 because the stop is excluded. Lists preserve order and can be updated: `expenses = [120, 80, 200]`. Use `sum(expenses)` to total numbers. A `while` loop repeats while its condition is true, so update state to avoid an infinite loop. `break` exits a loop; `continue` skips to the next iteration. Practice: total a list of daily transport costs.",
        "quiz": [
          {
            "q": "What values are produced by `list(range(2, 5))`?",
            "o": [
              "2, 3, 4",
              "2, 3, 4, 5",
              "1, 2, 3, 4",
              "5 only"
            ],
            "a": 0,
            "e": "The start is included and the stop is excluded."
          }
        ]
      },
      {
        "title": "Functions and reusable code",
        "body": "A function packages a task behind a meaningful name. Define it with `def`; parameters receive inputs and `return` sends a result back. Example: `def total(price, quantity): return price * quantity`. Keep functions focused, name them clearly and avoid hidden changes to global state. A docstring briefly explains purpose and expected arguments. Test a function with typical, boundary and invalid inputs. Practice: create `vat_amount(subtotal, rate)` that returns subtotal multiplied by rate.",
        "quiz": [
          {
            "q": "What is the main purpose of `return`?",
            "o": [
              "Prints automatically",
              "Sends a value back to the caller",
              "Repeats the function",
              "Defines a variable"
            ],
            "a": 1,
            "e": "return provides a result the caller can use."
          }
        ]
      },
      {
        "title": "Dictionaries, files and errors",
        "body": "A dictionary maps keys to values: `{\"name\": \"Asha\", \"amount\": 350}`. Use `.get()` for optional keys. Read and write files with `with open(path, encoding=\"utf-8\") as file:` so resources close reliably. JSON is useful for storing structured records; use the `json` module. Handle expected problems with narrow `try/except` blocks, and show users helpful messages without hiding bugs. Never assume a file exists or that its contents are valid. Practice: save and reload three expense records as JSON.",
        "quiz": [
          {
            "q": "Why use a `with open(...)` block?",
            "o": [
              "It encrypts the file",
              "It closes the file reliably",
              "It makes every file public",
              "It prevents all errors"
            ],
            "a": 1,
            "e": "The context manager closes the file even if an error occurs."
          }
        ]
      },
      {
        "title": "Modules, packages and virtual environments",
        "body": "Modules let you reuse code from Python’s standard library or installed packages. A virtual environment isolates dependencies per project: create one with `python -m venv .venv`, activate it, then install packages with `python -m pip install package-name`. Record dependencies in `requirements.txt`. Keep secrets out of source control and use a `.gitignore`. Prefer the standard library for small tasks before adding dependencies. Practice: create a clean project folder with `main.py`, `README.md` and a virtual environment.",
        "quiz": [
          {
            "q": "Why use a virtual environment?",
            "o": [
              "To isolate project dependencies",
              "To make code run without Python",
              "To publish passwords",
              "To replace testing"
            ],
            "a": 0,
            "e": "Isolated dependencies reduce conflicts between projects."
          }
        ]
      },
      {
        "title": "Capstone: a reliable expense tracker",
        "body": "Build a command-line expense tracker. Each record should include date, category, description and a positive amount. Separate responsibilities into functions: validate input, add expense, list expenses, calculate totals and save/load JSON. Handle missing or malformed files gracefully. Test empty data, one expense, many expenses, invalid amounts and corrupted JSON. Add a monthly/category summary and document how to run the program. Before sharing, remove personal data and include sample data only. Extension: export a CSV report and add automated unit tests.",
        "quiz": [
          {
            "q": "Which test is most useful for validating expense amount rules?",
            "o": [
              "Only test amount 100",
              "Test positive, zero, negative and non-numeric inputs",
              "Skip tests after it runs once",
              "Test only the screen colour"
            ],
            "a": 1,
            "e": "Boundary and invalid-input tests expose common validation defects."
          }
        ]
      }
    ]
  },
  {
    "slug": "ai-mastery",
    "title": "AI Foundations and Prompt Engineering",
    "summary": "Learn practical prompting, fact-checking, safe AI use and reusable workflows for study and work.",
    "price": 799,
    "lessons": [
      {
        "title": "How modern AI works",
        "body": "Artificial intelligence is a broad field; machine learning learns patterns from examples, and generative models produce new text, images, audio or code from learned patterns. A language model predicts likely next tokens; fluent output is not proof of truth. Training data, objectives and context shape behaviour. Use AI as a capable assistant, not an unquestionable authority. Decide in advance which tasks are low-risk enough to delegate and which require a qualified human. Practice: list three tasks where a draft is useful and three where independent verification is essential.",
        "quiz": [
          {
            "q": "Does fluent AI output guarantee that a statement is true?",
            "o": [
              "Yes",
              "No; it can produce plausible errors",
              "Only when the answer is long",
              "Only for code"
            ],
            "a": 1,
            "e": "Fluency and factual correctness are different; verify important claims."
          }
        ]
      },
      {
        "title": "Prompt structure that works",
        "body": "A strong prompt gives the model a role, task, context, constraints and a definition of success. Include the audience, desired format and examples when helpful. Replace vague asks such as “make this good” with observable requirements. Ask for assumptions to be stated and unknowns to be flagged. Iterate by changing one important variable at a time. Do not include passwords, private client data or confidential business records in an unapproved tool. Practice: write a prompt that turns rough meeting notes into decisions, owners and due dates.",
        "quiz": [
          {
            "q": "Which addition most improves an ambiguous prompt?",
            "o": [
              "More exclamation marks",
              "Audience, context and clear output criteria",
              "A longer greeting",
              "Removing constraints"
            ],
            "a": 1,
            "e": "Context and explicit success criteria reduce ambiguity."
          }
        ]
      },
      {
        "title": "Context, examples and iteration",
        "body": "Models can follow examples in the prompt (few-shot prompting) and use supplied context to ground answers. Provide relevant source text and tell the model not to invent missing details. Split complex tasks into stages: extract facts, draft, check against criteria, then format. Compare outputs against a rubric rather than judging by confidence alone. Keep prompts versioned for repeatable work. Practice: supply a short policy and ask the model to answer only from that policy, quoting the supporting sentence.",
        "quiz": [
          {
            "q": "Why provide trusted source text?",
            "o": [
              "It guarantees perfect answers",
              "It gives the model context to ground its response",
              "It removes the need for review",
              "It trains the public model automatically"
            ],
            "a": 1,
            "e": "Grounding helps constrain answers to the supplied evidence, though review remains necessary."
          }
        ]
      },
      {
        "title": "Research and fact checking",
        "body": "AI-generated citations can be wrong or fabricated. Verify every important citation by opening the source and checking that it supports the exact claim. Prefer primary sources, current official documentation and multiple independent sources for consequential facts. Record publication dates and separate sourced facts from interpretation. When evidence is missing, say so instead of filling gaps. Practice: verify a claim about a public service using its official website and one independent source; note any disagreement.",
        "quiz": [
          {
            "q": "What should you do with a citation that you have not opened?",
            "o": [
              "Trust it if it looks formal",
              "Verify the source and claim directly",
              "Assume it is current",
              "Copy it into a report"
            ],
            "a": 1,
            "e": "A citation must be checked for existence, relevance and support."
          }
        ]
      },
      {
        "title": "AI for writing, learning and coding",
        "body": "Use AI to brainstorm, outline, explain difficult concepts, critique drafts and generate test ideas. Ask for step-by-step explanations and then solve a similar problem without assistance to check understanding. For code, run tests, inspect dependencies and review security-sensitive changes. Do not submit AI-generated work as your own where rules prohibit it. Keep a record of where AI helped when disclosure is expected. Practice: ask for three alternative explanations of a concept, then explain it in your own words.",
        "quiz": [
          {
            "q": "How can a learner check that an AI explanation was understood?",
            "o": [
              "Copy it verbatim",
              "Solve a new example independently",
              "Ask for more emojis",
              "Skip practice"
            ],
            "a": 1,
            "e": "Independent application is stronger evidence of understanding than copying."
          }
        ]
      },
      {
        "title": "Bias, privacy and responsible use",
        "body": "Models can reproduce bias or omit underrepresented perspectives. Check outputs for stereotypes, unfair assumptions and unequal impacts. Minimise personal data; use anonymised examples and approved tools. Respect copyright, licensing and consent when using source material. For hiring, finance, health, education or legal decisions, keep qualified human review and follow applicable rules. Document limitations and provide a way to challenge harmful outputs. Practice: create a risk checklist for an AI tool that screens customer support messages.",
        "quiz": [
          {
            "q": "What is a safer default for sensitive personal data?",
            "o": [
              "Paste it into any chatbot",
              "Minimise or anonymise it and use approved tools",
              "Share it publicly",
              "Store it in a prompt library"
            ],
            "a": 1,
            "e": "Data minimisation and approved processing reduce privacy risks."
          }
        ]
      },
      {
        "title": "Designing useful AI workflows",
        "body": "Map a workflow before automating it: trigger, inputs, transformation, checks, output, owner and failure path. Define quality metrics such as time saved, error rate and user satisfaction. Keep human approval for consequential actions. Log decisions without collecting unnecessary personal information. Start with a small pilot, compare with the old process and provide a rollback path. Practice: design a workflow that drafts weekly sales summaries but requires a manager to approve them before sending.",
        "quiz": [
          {
            "q": "Why include a failure path in a workflow?",
            "o": [
              "Automation never fails",
              "To make errors visible and recover safely",
              "To remove all oversight",
              "To hide incomplete work"
            ],
            "a": 1,
            "e": "A defined recovery path helps contain errors and restore normal operation."
          }
        ]
      },
      {
        "title": "Capstone: build a verified AI assistant",
        "body": "Build a small assistant for a real, low-risk task such as answering questions from a student handbook. Define the audience and scope, prepare a small trusted knowledge base, write clear instructions, and require the assistant to say when evidence is missing. Test at least ten realistic questions, including ambiguous and out-of-scope ones. Score accuracy, source support, privacy and usability. Record failure cases and improve the prompt. Deliver a demo, test table, limitations note and a human escalation route.",
        "quiz": [
          {
            "q": "What should the assistant do when the knowledge base lacks an answer?",
            "o": [
              "Invent a confident response",
              "Say the information is unavailable and point to a human source",
              "Reveal unrelated records",
              "Pretend it searched"
            ],
            "a": 1,
            "e": "Safe assistants communicate uncertainty and offer an appropriate escalation."
          }
        ]
      }
    ]
  },
  {
    "slug": "web-development",
    "title": "Build Websites and Landing Pages",
    "summary": "Build and publish a mobile-friendly website for a local business using HTML, CSS and beginner JavaScript.",
    "price": 1499,
    "lessons": [
      {
        "title": "How the web works",
        "body": "A browser requests a URL, a server responds with resources and the browser renders HTML, CSS and JavaScript. DNS maps domain names to addresses; HTTPS encrypts traffic in transit. HTML describes content, CSS controls presentation and JavaScript adds behaviour. Learn to use browser developer tools to inspect markup, network requests, console errors and responsive layouts. Practice: inspect a website and identify its document, stylesheet and script requests.",
        "quiz": [
          {
            "q": "Which technology defines a page’s semantic structure?",
            "o": [
              "CSS",
              "HTML",
              "SQL",
              "DNS"
            ],
            "a": 1,
            "e": "HTML describes the structure and meaning of web content."
          }
        ]
      },
      {
        "title": "Semantic HTML and accessible structure",
        "body": "Use landmarks such as `header`, `nav`, `main` and `footer`, and headings in logical order. Buttons perform actions; links navigate. Every form control needs a visible label. Images need meaningful alternative text when informative, while decorative images use empty alt text. Native HTML controls often provide keyboard and screen-reader behaviour for free. Validate the page with keyboard-only navigation and an automated accessibility checker, then manually review results. Practice: create an accessible contact form with name, email and message fields.",
        "quiz": [
          {
            "q": "Which element is best for an action that submits a form?",
            "o": [
              "A styled span",
              "A button with type=\"submit\"",
              "A heading",
              "An image"
            ],
            "a": 1,
            "e": "Native submit buttons provide expected keyboard and form behaviour."
          }
        ]
      },
      {
        "title": "CSS layout and responsive design",
        "body": "Use the box model deliberately: content, padding, border and margin. Flexbox is ideal for one-dimensional alignment; CSS Grid handles two-dimensional layouts. Use relative units and media queries to adapt to small screens. Avoid fixed widths that force horizontal scrolling. Define a small spacing and colour system with custom properties for consistency. Practice: build a three-card layout that becomes one column on narrow screens, and test at 320px, tablet and desktop widths.",
        "quiz": [
          {
            "q": "Which CSS tool is designed for two-dimensional layouts?",
            "o": [
              "Grid",
              "Float only",
              "Text-align",
              "z-index"
            ],
            "a": 0,
            "e": "CSS Grid handles rows and columns together."
          }
        ]
      },
      {
        "title": "JavaScript fundamentals and DOM",
        "body": "Use `const` by default and `let` when reassignment is needed. Functions express reusable behaviour; arrays and objects structure data. The DOM represents page elements, and event listeners respond to user actions. Avoid inserting untrusted strings with `innerHTML`; use `textContent` or safe DOM methods. Handle asynchronous requests with `async/await` and visible error states. Practice: build a task list that adds a task on form submission and announces an empty-list state.",
        "quiz": [
          {
            "q": "Why is `textContent` safer for displaying untrusted text?",
            "o": [
              "It executes HTML",
              "It treats content as text instead of parsing markup",
              "It encrypts content",
              "It automatically saves to a database"
            ],
            "a": 1,
            "e": "textContent does not interpret the value as HTML markup."
          }
        ]
      },
      {
        "title": "Forms, validation and UX states",
        "body": "Use HTML validation such as `required`, appropriate input types and helpful error messages, then validate again on the server. Never rely on browser checks for security. Design loading, success, empty and error states so users know what happened. Preserve entered values after recoverable errors and avoid duplicate submissions. Keep labels and instructions close to fields. Practice: build a registration form with inline validation and a confirmation state without exposing sensitive details.",
        "quiz": [
          {
            "q": "Where must security-sensitive input validation happen?",
            "o": [
              "Only in CSS",
              "Only in the browser",
              "On the server, with client validation as extra help",
              "Nowhere"
            ],
            "a": 2,
            "e": "Clients can be bypassed, so the server must enforce rules."
          }
        ]
      },
      {
        "title": "APIs and asynchronous data",
        "body": "An API lets applications exchange structured data. HTTP methods commonly include GET for reading, POST for creating, PUT/PATCH for updates and DELETE for removal. Check status codes and parse JSON safely. Handle slow networks, empty results and server errors. Keep secrets on the server, never in browser JavaScript. Practice: fetch a public data endpoint, show a loading indicator, render results as text and display a useful message if the request fails.",
        "quiz": [
          {
            "q": "Where should a private API secret be stored?",
            "o": [
              "In public frontend JavaScript",
              "In a server-side environment variable",
              "In an image alt attribute",
              "In the page title"
            ],
            "a": 1,
            "e": "Browser code is visible to visitors; private secrets belong server-side."
          }
        ]
      },
      {
        "title": "Testing, performance and security",
        "body": "Test keyboard use, small screens, form errors and core flows. Optimise image sizes, avoid unnecessary scripts and measure performance instead of guessing. Use HTTPS, secure cookies and appropriate content security policies. Escape output, validate inputs and protect sensitive routes with server-side authorization. Keep dependencies updated and never commit secrets. Practice: create a release checklist covering accessibility, performance, broken links, form validation and a backup/rollback plan.",
        "quiz": [
          {
            "q": "Is hiding an admin button enough to secure an admin endpoint?",
            "o": [
              "Yes",
              "No; the server must check authorization",
              "Only on mobile",
              "Only if the button is green"
            ],
            "a": 1,
            "e": "Users can call endpoints directly; authorization belongs on the server."
          }
        ]
      },
      {
        "title": "Capstone: launch a portfolio website",
        "body": "Create a responsive personal portfolio with an accessible home page, project case studies, skills, contact form and clear calls to action. Use semantic HTML, reusable CSS patterns and progressive JavaScript. Add descriptive page titles, metadata, a favicon and a not-found page. Test mobile, keyboard navigation, form failures and network errors. Deploy using a reputable host, connect a domain if available and document updates and backups. Deliver the live URL, source repository, screenshots and a short explanation of design decisions.",
        "quiz": [
          {
            "q": "What is essential before calling a site launch-ready?",
            "o": [
              "Only a logo",
              "Testing responsive, accessible and critical user flows",
              "A large animation",
              "A hidden contact form"
            ],
            "a": 1,
            "e": "Launch quality depends on core flows and usability, not decoration alone."
          }
        ]
      }
    ]
  },
  {
    "slug": "machine-learning",
    "title": "Machine Learning and Data Science Foundations",
    "summary": "Work with real datasets, clean data, explore patterns, train baseline models and evaluate results responsibly.",
    "price": 2000,
    "lessons": [
      {
        "title": "Data questions and project framing",
        "body": "Start with a decision, not an algorithm. Define the target question, who will use the result, what data is permitted, and what a useful outcome means. Distinguish descriptive analysis (“what happened?”), diagnostic (“why?”), predictive (“what may happen?”) and prescriptive (“what should we do?”). Write assumptions and risks before collecting data. Practice: frame a small project to understand weekly shop sales without collecting unnecessary customer identifiers.",
        "quiz": [
          {
            "q": "What should a data project define before choosing a model?",
            "o": [
              "Only the chart colours",
              "The decision, target question and success measure",
              "The most complex algorithm",
              "The final headline"
            ],
            "a": 1,
            "e": "A clear decision and success measure guide appropriate methods."
          }
        ]
      },
      {
        "title": "Data quality and cleaning",
        "body": "Inspect shape, column types, missingness, duplicates and impossible values. Understand why data is missing before filling it. Standardise dates and categories, validate ranges and document every transformation. Keep raw data unchanged and write cleaned outputs separately. Avoid silently deleting unusual records; they may be important. Practice: audit a sales table with missing prices, duplicated receipts and inconsistent date formats, then write a cleaning log.",
        "quiz": [
          {
            "q": "Why keep a raw copy of source data?",
            "o": [
              "To make files larger",
              "To preserve an auditable source for repeatable cleaning",
              "To avoid documentation",
              "To replace validation"
            ],
            "a": 1,
            "e": "Raw data supports traceability and reproducibility."
          }
        ]
      },
      {
        "title": "Exploratory analysis and statistics",
        "body": "Use counts, means, medians, percentiles and visualisations to understand distributions. A mean can be distorted by outliers; a median is often more robust for skewed data. Correlation describes association, not causation. Compare groups carefully and inspect sample sizes. Label charts with units and date ranges. Practice: analyse monthly sales and compare mean versus median daily revenue, explaining the effect of a very large sale.",
        "quiz": [
          {
            "q": "Does correlation alone prove that one variable causes another?",
            "o": [
              "Always",
              "No",
              "Only in a scatter plot",
              "Only with decimals"
            ],
            "a": 1,
            "e": "Confounding and other explanations can produce correlation."
          }
        ]
      },
      {
        "title": "Visualisation and communicating insights",
        "body": "Choose charts based on the question: line charts for change over time, bars for category comparisons and scatter plots for relationships. Avoid misleading axes, overcrowded labels and unnecessary 3D effects. Include titles, units, source and time period. A good insight states the observation, its context, the caveat and the decision it may inform. Practice: produce a one-page sales summary with three charts and three evidence-based findings.",
        "quiz": [
          {
            "q": "Which chart is usually best for monthly trends?",
            "o": [
              "Pie chart with many slices",
              "Line chart",
              "Word cloud",
              "3D decorative chart"
            ],
            "a": 1,
            "e": "A line chart makes temporal patterns easier to see."
          }
        ]
      },
      {
        "title": "Train and test data correctly",
        "body": "Split data into training and test sets before fitting transformations that learn from data. Use validation data or cross-validation to tune models; keep the test set for final evaluation. For time series, split chronologically rather than randomly when future prediction is the goal. Data leakage occurs when information unavailable at prediction time influences training. Establish a simple baseline first. Practice: outline a leakage-safe workflow for predicting next month’s demand.",
        "quiz": [
          {
            "q": "Why keep the test set separate until final evaluation?",
            "o": [
              "To improve the colours",
              "To estimate performance on unseen data",
              "To guarantee 100% accuracy",
              "To remove missing values automatically"
            ],
            "a": 1,
            "e": "Repeated tuning on the test set makes its estimate overly optimistic."
          }
        ]
      },
      {
        "title": "Supervised learning and metrics",
        "body": "Regression predicts numeric values; classification predicts categories. For classification, accuracy can be misleading when classes are imbalanced. Precision measures how many predicted positives are correct; recall measures how many actual positives were found. Use a confusion matrix and select metrics based on the cost of errors. For regression, MAE is easy to interpret in target units; RMSE penalises larger errors more. Practice: choose metrics for a model flagging potentially fraudulent transactions and explain the trade-off.",
        "quiz": [
          {
            "q": "When false negatives are especially costly, which metric deserves close attention?",
            "o": [
              "Recall",
              "Font size",
              "File size",
              "R-squared only"
            ],
            "a": 0,
            "e": "Recall measures the share of actual positive cases detected."
          }
        ]
      },
      {
        "title": "Model comparison and interpretability",
        "body": "Start with a simple baseline, then compare candidate models using the same split and metrics. Tune only using training/validation data. Inspect performance across relevant subgroups and investigate errors rather than reporting a single score. Feature importance can be useful but is not proof of causation. Record the dataset version, preprocessing, model settings and evaluation results. Practice: compare a baseline and a decision tree, then write a short model card with intended use and limitations.",
        "quiz": [
          {
            "q": "What is a model card useful for?",
            "o": [
              "Documenting intended use, evaluation and limitations",
              "Replacing data cleaning",
              "Guaranteeing fairness",
              "Hiding weak results"
            ],
            "a": 0,
            "e": "Model documentation helps others understand appropriate use and limits."
          }
        ]
      },
      {
        "title": "Capstone: end-to-end data project",
        "body": "Choose a public or synthetic dataset, define a practical question, document data provenance, clean and explore it, visualise key patterns, create a baseline and evaluate it with an appropriate split. Explain limitations, uncertainty and who could be harmed by misuse. Package a reproducible notebook or script, README, charts and concise findings. Do not claim causation from observational data or expose personal data. Extension: schedule a refresh and monitor whether incoming data differs from training data.",
        "quiz": [
          {
            "q": "What makes a data project reproducible?",
            "o": [
              "Only a screenshot",
              "Documented data sources, steps, environment and instructions",
              "An undocumented spreadsheet",
              "A high model score alone"
            ],
            "a": 1,
            "e": "Reproducibility requires enough information to rerun and audit the workflow."
          }
        ]
      }
    ]
  },
  {
    "slug": "backend-engineering",
    "title": "Backend Engineering, SQL and Secure APIs",
    "summary": "Design relational data, write robust APIs, implement authentication and authorization, test services and deploy responsibly.",
    "price": 1800,
    "lessons": [
      {
        "title": "Backend architecture and HTTP",
        "body": "A backend receives requests, validates them, applies business rules, accesses data and returns responses. HTTP methods express intent: GET reads, POST creates or triggers an action, PUT replaces, PATCH partially updates and DELETE removes. Status codes communicate outcomes: 2xx success, 4xx client issue and 5xx server issue. Keep business logic separate from transport and storage where practical. Practice: sketch the request flow for a student enrolling in a course.",
        "quiz": [
          {
            "q": "Which status family indicates a server-side failure?",
            "o": [
              "2xx",
              "3xx",
              "4xx",
              "5xx"
            ],
            "a": 3,
            "e": "5xx status codes indicate that the server failed to fulfil a valid request."
          }
        ]
      },
      {
        "title": "Relational data and schema design",
        "body": "Model entities and their relationships before writing tables. Give each row a stable primary key; use foreign keys to preserve references. Normalisation reduces update anomalies by storing each fact in the appropriate place. Choose types and constraints deliberately, and define uniqueness where the business rule requires it. Practice: design users, courses, lessons and enrolments with keys and relationships, then explain why enrolment links a user to a course.",
        "quiz": [
          {
            "q": "What does a foreign key help enforce?",
            "o": [
              "A relationship to a referenced row",
              "A faster internet connection",
              "Password complexity",
              "CSS layout"
            ],
            "a": 0,
            "e": "Foreign keys help prevent references to nonexistent records."
          }
        ]
      },
      {
        "title": "SQL queries and transactions",
        "body": "Use parameterised queries instead of string concatenation. Learn SELECT, WHERE, JOIN, GROUP BY, ORDER BY and aggregate functions. Transactions group changes so related writes commit together or roll back. Add indexes to support measured query patterns, not every column. Use migrations to change schemas repeatably. Practice: query each student’s completed lesson count and test the result with zero, one and many lessons.",
        "quiz": [
          {
            "q": "Why use parameterised SQL queries?",
            "o": [
              "To reduce SQL injection risk",
              "To colour output",
              "To bypass permissions",
              "To skip database constraints"
            ],
            "a": 0,
            "e": "Parameters keep user input separate from SQL instructions."
          }
        ]
      },
      {
        "title": "REST API design and validation",
        "body": "Use predictable resource-oriented routes and consistent JSON error shapes. Validate types, lengths, ranges and allowed values on the server. Reject unknown or malformed input where appropriate. Keep API responses stable and avoid exposing internal stack traces. Consider pagination for lists and idempotency for retryable actions. Practice: design create-course and list-course endpoints with example requests, success responses and validation errors.",
        "quiz": [
          {
            "q": "Can client-side validation replace server-side validation?",
            "o": [
              "Yes, always",
              "No; clients can be bypassed",
              "Only for admins",
              "Only for JSON"
            ],
            "a": 1,
            "e": "Server-side validation is required because clients are not trusted."
          }
        ]
      },
      {
        "title": "Authentication and authorization",
        "body": "Authentication establishes who a user is; authorization determines what they may do. Store password hashes using a purpose-built password hashing algorithm and unique salts, never plaintext. Use secure, HttpOnly cookies over HTTPS, session expiry and logout invalidation. Enforce role and resource ownership checks on every protected endpoint. Apply rate limits to login and recovery flows. Practice: create an access matrix for student, instructor and administrator actions.",
        "quiz": [
          {
            "q": "What is the difference between authentication and authorization?",
            "o": [
              "They are identical",
              "Identity versus permission to perform an action",
              "Both mean encryption",
              "Neither needs server checks"
            ],
            "a": 1,
            "e": "Authentication verifies identity; authorization checks permission."
          }
        ]
      },
      {
        "title": "Application security and secrets",
        "body": "Use least privilege, validate and encode inputs/outputs, protect session cookies, and keep secrets in environment or managed secret storage. Never commit API keys. Add CSRF protection when cookie-authenticated state-changing routes and deployment context require it. Set security headers, log security-relevant events without passwords or tokens, and update dependencies. Threat-model assets, entry points, attackers and likely impact. Practice: review an API that trusts a submitted userId and list the authorization fix.",
        "quiz": [
          {
            "q": "Where should production credentials live?",
            "o": [
              "Committed source code",
              "A public repository README",
              "A secret manager or protected environment configuration",
              "A browser local variable"
            ],
            "a": 2,
            "e": "Secrets must not be distributed to users or committed to source control."
          }
        ]
      },
      {
        "title": "Testing, observability and deployment",
        "body": "Use unit tests for small rules, integration tests for database and API behaviour, and end-to-end tests for critical journeys. Test denied access as carefully as successful access. Structured logs, request IDs and health checks help diagnose production problems; avoid logging sensitive values. Deploy with configuration separated from code, backups, migrations and a rollback plan. Monitor latency, error rates and resource use. Practice: write a deployment checklist for a course platform with payments and certificates.",
        "quiz": [
          {
            "q": "Why test denied access paths?",
            "o": [
              "They are irrelevant",
              "To catch authorization failures and data leaks",
              "To slow the service",
              "To replace successful tests"
            ],
            "a": 1,
            "e": "Security failures often appear in paths that should be rejected."
          }
        ]
      },
      {
        "title": "Capstone: secure course API",
        "body": "Build or document an API for courses, lessons and enrolments. Include relational schema, parameterised queries, authenticated routes, role/ownership checks, validation, consistent errors, rate limiting and tests for both allowed and denied requests. Add migration instructions, environment-variable examples, a health endpoint and backup/rollback notes. Use test data only. Deliver an API specification, schema diagram, test report and deployment guide. Review the design against the principle of least privilege.",
        "quiz": [
          {
            "q": "Which evidence best supports a claim that an API is secure?",
            "o": [
              "A polished logo",
              "Tests of permissions, validation, failure cases and configuration review",
              "Only a successful GET",
              "No error messages"
            ],
            "a": 1,
            "e": "Security is supported by layered controls and tests, not appearance alone."
          }
        ]
      }
    ]
  },
  {
    "slug": "ai-automation",
    "title": "AI Tools and Automation for Business",
    "summary": "Use AI to draft customer replies, product descriptions, proposals and reports, then build a practical small-business workflow.",
    "price": 999,
    "lessons": [
      {
        "title": "Find the right process to automate",
        "body": "Good automation starts with a stable, repeated process and a clear pain point. Map the current steps, wait times, exceptions, owners and failure costs. Avoid automating a broken process before simplifying it. Estimate time saved and ongoing maintenance; include exceptions and review time. Choose a low-risk pilot with measurable outcomes. Practice: map how a small shop records orders and identifies one repetitive step suitable for a controlled automation.",
        "quiz": [
          {
            "q": "What should happen before automating a process?",
            "o": [
              "Automate every step immediately",
              "Understand and simplify the current process",
              "Remove all human review",
              "Buy the most expensive tool"
            ],
            "a": 1,
            "e": "Process mapping helps avoid automating unnecessary complexity."
          }
        ]
      },
      {
        "title": "Workflow triggers, actions and state",
        "body": "A workflow typically has a trigger, input validation, actions, branching logic and a final status. Define what happens when an input is missing, a service is unavailable or the same event arrives twice. Use unique event identifiers and idempotent actions where possible. Separate test and production credentials. Practice: design an order-confirmation flow that validates order details, sends a draft message and records whether sending succeeded.",
        "quiz": [
          {
            "q": "Why make an action idempotent when possible?",
            "o": [
              "To safely handle retries without duplicating effects",
              "To hide errors",
              "To skip validation",
              "To increase message length"
            ],
            "a": 0,
            "e": "Idempotency makes repeated processing less likely to create duplicate effects."
          }
        ]
      },
      {
        "title": "Use AI for classification and drafting",
        "body": "AI can classify incoming requests, extract fields from unstructured text or draft responses. Define allowed categories, examples and confidence thresholds. Validate extracted fields and preserve the original source for review. Do not let a model make high-impact decisions without suitable safeguards. Evaluate a representative sample, including slang, spelling errors and edge cases. Practice: classify support tickets into billing, technical, delivery or other, and route uncertain cases to a human.",
        "quiz": [
          {
            "q": "What should happen to low-confidence classifications?",
            "o": [
              "Force a category silently",
              "Route them for human review",
              "Delete the ticket",
              "Send an automatic refund"
            ],
            "a": 1,
            "e": "Human review catches uncertain or out-of-scope cases."
          }
        ]
      },
      {
        "title": "Connectors, APIs and webhooks",
        "body": "Connectors and APIs let systems exchange data. Store credentials securely and grant only required permissions. Webhooks notify a receiving endpoint about events; verify signatures, validate payloads and reject replays where appropriate. Add timeouts, bounded retries and dead-letter handling for failures. Avoid exposing personal information in URLs or logs. Practice: outline a secure workflow receiving a payment event and updating an order only after verifying the event and amount.",
        "quiz": [
          {
            "q": "What should a payment webhook verify before granting access?",
            "o": [
              "Only the customer name",
              "Authenticity and matching transaction details",
              "A screenshot",
              "The browser colour"
            ],
            "a": 1,
            "e": "A trusted signature and verified transaction values prevent forged confirmations."
          }
        ]
      },
      {
        "title": "Human approvals and exception handling",
        "body": "Keep human approval for external messages, money movement, account changes and decisions with significant consequences. Present reviewers with the proposed action, relevant evidence and a clear approve/reject path. Time out stalled approvals and alert the owner. Define a safe fallback when the automation is unavailable. Practice: create an approval step for invoices above a threshold and a manual queue when supplier details do not match.",
        "quiz": [
          {
            "q": "Which task is a strong candidate for mandatory human approval?",
            "o": [
              "Formatting a private draft",
              "Sending a large payment",
              "Sorting a local sample list",
              "Renaming a test file"
            ],
            "a": 1,
            "e": "High-impact financial actions need clear authorization and review."
          }
        ]
      },
      {
        "title": "Privacy, security and audit logs",
        "body": "Collect only data the workflow needs, set retention periods and restrict access. Use approved processors and honour relevant privacy obligations. Logs should show what happened, when and which workflow version ran, but should not expose passwords, payment secrets or unnecessary personal data. Separate environments and rotate credentials. Practice: design an audit event containing a workflow ID, event ID, outcome and timestamp while omitting private message contents.",
        "quiz": [
          {
            "q": "What is a good audit-log principle?",
            "o": [
              "Log every secret for debugging",
              "Record necessary events while minimising sensitive data",
              "Make logs publicly readable",
              "Never record failures"
            ],
            "a": 1,
            "e": "Useful audit logs support accountability without creating unnecessary data exposure."
          }
        ]
      },
      {
        "title": "Measure, monitor and maintain",
        "body": "Define baseline and target metrics: completion time, error rate, rework, cost per task and user satisfaction. Track false positives and false negatives for AI steps. Alert on unusual failure rates, expired credentials and growing queues. Review performance after tool changes and update test cases when the process changes. Keep an owner and a documented disable switch. Practice: calculate weekly time saved while subtracting manual review and maintenance time.",
        "quiz": [
          {
            "q": "What is the best way to know if automation is helping?",
            "o": [
              "Count how many steps it has",
              "Compare measured outcomes with a baseline and include review costs",
              "Assume more automation is better",
              "Ignore errors"
            ],
            "a": 1,
            "e": "A baseline and total operating cost reveal whether the workflow delivers value."
          }
        ]
      },
      {
        "title": "Capstone: automate a real workflow safely",
        "body": "Choose a low-risk workflow such as turning approved form submissions into a task list. Draw the process, define trigger and data schema, add validation, duplicate-event protection, AI assistance only where useful, human review, failure alerts and an audit log. Test normal, malformed, duplicate, delayed and rejected inputs. Measure baseline versus pilot time and error rate. Deliver a workflow diagram, test evidence, data-handling note, owner instructions and a clear stop/rollback procedure.",
        "quiz": [
          {
            "q": "What must a responsible automation capstone include?",
            "o": [
              "Only a successful demo",
              "Error handling, human oversight, tests and measured outcomes",
              "Unrestricted access to all accounts",
              "No owner"
            ],
            "a": 1,
            "e": "Reliable automation includes safeguards, testing, accountability and measurement."
          }
        ]
      }
    ]
  },
  {
    "slug": "excel-business-dashboards",
    "title": "Excel, Business Data and Dashboards",
    "summary": "Clean spreadsheets, use formulas and pivot tables, and build a sales-and-expenses dashboard for business decisions.",
    "price": 999,
    "lessons": [
      {"title":"Set up a clean business workbook","body":"Start with a clear purpose: track sales, expenses and profit. Keep one record per row, one field per column, consistent dates, and a single header row. Avoid merged cells in raw data. Use descriptive sheet names and save a clean source copy before making changes. Use clearly labelled sample records for practice and replace them with authorised real records when applying the method.","quiz":[{"q":"Which layout is easiest to analyse?","o":["One transaction per row with consistent columns","A different layout for every transaction","Merged cells throughout the data","Numbers stored inside paragraph text"],"a":0,"e":"Consistent tabular records are easier to filter, validate and analyse."}]},
      {"title":"Formulas for totals and profit","body":"Use SUM to total a range, AVERAGE to find a mean, and COUNTIF or SUMIF to summarise records by a condition. Profit is revenue minus costs; do not confuse cash received with profit. Check formulas against a small hand-calculated example and watch for blank cells, text-formatted numbers and duplicated rows. Practice by calculating daily sales, expenses and net profit from a small sample table.","quiz":[{"q":"How is basic profit calculated?","o":["Costs minus revenue","Revenue minus costs","Revenue plus costs","Revenue divided by dates"],"a":1,"e":"Profit is revenue less the relevant costs for the same period."}]},
      {"title":"Clean and validate data","body":"Standardise dates, spelling, category labels and currency values. Use filters to inspect unusual records, remove duplicates only after checking the business rule, and apply data validation to prevent invalid categories. Never silently delete suspicious transactions; flag them for review. Keep an audit copy when changing source data. Practice by finding duplicate invoice numbers and inconsistent category names in a sample sheet.","quiz":[{"q":"What should you do with a suspicious duplicate transaction?","o":["Delete it immediately without checking","Ignore all duplicates","Flag it and verify against the source record","Change its amount to zero"],"a":2,"e":"Duplicates can be legitimate or erroneous; verify before changing records."}]},
      {"title":"Summarise with pivot tables and charts","body":"Pivot tables can group records by date, product or category without rewriting the source data. Choose chart types that match the question: a line chart for change over time, bars for category comparisons. Label axes, include units and avoid decorative effects that obscure meaning. Check totals against the underlying data and state the reporting period clearly. Practice by comparing sales by product and month.","quiz":[{"q":"Which chart is usually useful for comparing sales across product categories?","o":["Bar chart","Random decorative chart","Unlabelled 3D pie chart","A screenshot of the raw table"],"a":0,"e":"Bars make category comparisons straightforward to read."}]},
      {"title":"Build a decision-ready dashboard","body":"A useful dashboard answers a small set of business questions: total sales, total expenses, profit, best-selling category and trend over time. Put key metrics first, use consistent number formats and add filters only when they help users answer questions. Show the date range and explain definitions. Do not present sample figures as live business performance. Practice by creating a one-page dashboard from a clearly labelled training dataset.","quiz":[{"q":"What makes a dashboard trustworthy?","o":["Unlabelled metrics and hidden date ranges","Clearly defined metrics, dates and traceable source data","Only bright colours","Figures with no source"],"a":1,"e":"Users need definitions and context to interpret metrics responsibly."}]},
      {"title":"Capstone: sales and expense dashboard","body":"Create a workbook with a clean transaction table, data checks, formulas, a category summary and a one-page dashboard. Include at least three insights, such as a high-cost category or a monthly sales change, and explain the limits of the sample data. Test totals against manual calculations and document how a business owner can replace the training records with their own authorised records. Deliver the workbook and a short walkthrough.","quiz":[{"q":"What should the final project include?","o":["Only a chart image","A checked workbook, explained insights and instructions to update data","Invented business results presented as real","No validation"],"a":1,"e":"A usable capstone includes the working file, evidence and update instructions."}]}
    ]
  },
  {
    "slug": "short-video-editing",
    "title": "Short-Form Video Editing with AI",
    "summary": "Plan, edit and caption vertical promotional videos for social platforms using an accessible editing workflow.",
    "price": 799,
    "lessons": [
      {"title":"Plan a short video that has one goal","body":"Choose one audience and one action for the video: visit a shop, ask for a quote, learn a tip or view a product. Use a simple structure: hook, useful detail, proof or demonstration, and call to action. Write the script before editing and keep claims accurate. Use only footage, music and images you have permission to use. Practice by scripting a 20-second advert for a fictional local business.","quiz":[{"q":"What should a short promotional video ideally have?","o":["Several unrelated goals","One clear audience and action","No structure","A misleading claim"],"a":1,"e":"A focused message makes the video easier to understand and act on."}]},
      {"title":"Capture clean footage on a phone","body":"Clean the camera lens, use steady framing, record in good light and keep the subject's voice clear. Film extra short clips that show the product, service or process. Keep backgrounds tidy and ask permission before filming people or private premises. Capture vertical footage when the intended placement is a vertical feed. Practice by recording a wide shot, a close-up and a demonstration clip.","quiz":[{"q":"Which step often improves phone footage immediately?","o":["Covering the camera lens","Cleaning the lens and using steady framing","Recording in darkness","Adding effects before filming"],"a":1,"e":"Clean optics and stable framing improve clarity before editing."}]},
      {"title":"Edit for pace and clarity","body":"Import clips, select the strongest moments, remove dead time and keep transitions simple. Make sure the viewer can understand the sequence without relying on effects. Use a readable typeface and leave space around on-screen text so platform controls do not cover it. Keep a copy of the original media and export a review version before final delivery. Practice by cutting a 30-second draft from several clips.","quiz":[{"q":"What is the main purpose of trimming dead time?","o":["Make the message clearer and maintain pace","Hide every product detail","Make the file impossible to edit","Replace the script"],"a":0,"e":"Removing unnecessary pauses helps viewers follow the message."}]},
      {"title":"Add captions, sound and accessible text","body":"Captions help viewers watching without sound, but automatic transcription can make mistakes. Review names, prices, Swahili and English words before publishing. Keep music lower than speech, use licensed or permitted audio, and ensure text has strong contrast. Avoid flashing effects that may make content uncomfortable. Practice by captioning a short spoken clip and correcting the transcript manually.","quiz":[{"q":"Why review auto-generated captions?","o":["They are always perfect","They can mishear names, prices and words","Captions are never useful","It makes the video longer"],"a":1,"e":"Automatic captions need human review for accuracy and readability."}]},
      {"title":"Export for social platforms","body":"Export in a supported vertical aspect ratio and resolution for the target platform, and watch the complete exported file before delivery. Check the opening frame, captions, audio levels, spelling and call to action. Save an editable project and a final export. Keep platform specifications current because recommendations can change. Practice by exporting one clean version and one captioned version, then compare readability on a phone.","quiz":[{"q":"What should you do after exporting?","o":["Publish without checking","Watch the full file and check captions, audio and spelling","Delete the project file","Assume every platform has identical requirements"],"a":1,"e":"Reviewing the actual export catches errors that may not be obvious in the timeline."}]},
      {"title":"Capstone: three-video business pack","body":"Create three short vertical videos for a fictional or consenting local business: a product or service demonstration, a useful tip, and a direct promotional offer. Each video should have one goal, reviewed captions, appropriate audio, a clear call to action and a clean export. Provide a simple posting suggestion and disclose any AI-generated visuals or voice where relevant. Use only authorised assets and never invent customer testimonials.","quiz":[{"q":"What is a strong final deliverable?","o":["Three exported videos, source projects and a short posting plan","A folder of unlicensed music","An unverified customer testimonial","Only a list of editing apps"],"a":0,"e":"The deliverable should be ready to review and practical to hand over."}]}
    ]
  },
  {
    "slug": "digital-marketing-sales",
    "title": "Digital Marketing That Tracks Sales",
    "summary": "Plan content, create clear offers, track leads and measure marketing activity against business goals.",
    "price": 999,
    "lessons": [
      {"title":"Define the customer and business goal","body":"Start with one business objective, such as qualified enquiries, bookings or purchases. Describe the audience's needs, buying concerns and preferred channels using evidence rather than stereotypes. Make the offer specific and realistic, and identify the next action you want people to take. Practice by writing a one-page customer profile and goal for a fictional Nairobi salon, repair service or food business.","quiz":[{"q":"What should guide a campaign?","o":["A clear business goal and defined audience","Posting randomly on every platform","Follower count alone","Unverified claims"],"a":0,"e":"A defined goal and audience help determine content and measurement."}]},
      {"title":"Build a useful content calendar","body":"Plan a balanced set of posts: useful advice, product or service demonstrations, answers to common questions, customer education and clear offers. Set a realistic posting frequency and reuse ideas in different formats without copying others' work. Assign an owner and a publish date to each item. Practice by creating a 14-day calendar with a topic, format, call to action and success measure for every post.","quiz":[{"q":"What makes a content calendar actionable?","o":["Only a list of slogans","Topics, formats, dates, owners and intended actions","No target audience","Unscheduled posts"],"a":1,"e":"Clear fields help turn ideas into consistent execution."}]},
      {"title":"Write offers and calls to action","body":"Lead with a customer problem or desired result, explain the offer honestly and make the next step easy. A call to action may invite someone to request a quote, book a service or view a catalogue. Avoid fake scarcity, misleading discounts and promises you cannot prove. Practice by writing three versions of an advert for the same legitimate offer and compare clarity, not hype.","quiz":[{"q":"Which marketing practice builds trust?","o":["Fake scarcity","Clear and accurate offers","Invented reviews","Hidden fees"],"a":1,"e":"Transparent claims and pricing help customers make informed choices."}]},
      {"title":"Create basic campaign tracking","body":"Use consistent campaign names and track leads by source, date, status and next action. Measure useful outcomes such as qualified enquiries, bookings, sales and cost per lead where cost data is available. Do not collect unnecessary personal information; restrict access to customer records and follow applicable privacy requirements. Practice by making a simple leads tracker with sample records clearly marked as training data.","quiz":[{"q":"Why record the source of each lead?","o":["To identify which activities generate enquiries","To publish customer phone numbers","To make totals look bigger","It has no use"],"a":0,"e":"Lead source helps compare the performance of marketing activities."}]},
      {"title":"Improve campaigns using evidence","body":"Compare results over a consistent period and account for differences in spend, audience and offer. Change one major variable at a time where possible, and avoid drawing strong conclusions from a tiny sample. A high number of views may not produce sales, so connect attention metrics to business outcomes. Practice by reviewing a training campaign table and recommending one change with a reason and a measure to watch.","quiz":[{"q":"Which result is closest to a business outcome?","o":["A view with no further context","A qualified enquiry or completed sale","A decorative graphic","The number of emojis used"],"a":1,"e":"Qualified enquiries and sales are closer to the intended business goal."}]},
      {"title":"Capstone: 14-day campaign plan","body":"Prepare a 14-day campaign for a real business with permission or a clearly fictional case. Include the audience, offer, calendar, three sample creatives, calls to action, lead-tracking sheet and weekly review plan. State what is unknown and how results will be measured. Do not claim the campaign generated sales unless real tracking supports that statement. Deliver a concise report that a business owner can execute and evaluate.","quiz":[{"q":"What should a credible campaign report avoid?","o":["Stating the measurement period","Explaining limitations","Claiming results that were not measured","Listing the next experiment"],"a":2,"e":"Marketing results should be supported by actual observations."}]}
    ]
  }

];
