export type Decision =
  | "Strong Accept"
  | "Accept"
  | "Weak Accept"
  | "Borderline"
  | "Weak Reject"
  | "Reject"
  | "Strong Reject";

export const project = {
  name: "Failure-Aware AI Systems",
  theme: "自分の失敗を理解し学習を改善するAI",
  northStar: "最強のAIを自分の手で作る",
  weekFocus: "pseudo label noiseを、confidence以外のdebugging signalで減らせるか",
};

export const todayTraining = [
  {
    title: "論文問題",
    detail: "IFAL / pseudo GT selection から5問",
    status: "ready",
  },
  {
    title: "考察再提出",
    detail: "mechanism explanationを3段階に分解",
    status: "due",
  },
  {
    title: "実装タスクレビュー",
    detail: "ablation configとCSV出力を確認",
    status: "running",
  },
];

export const scoreTracks = [
  { label: "論文理解", value: 72, delta: 8, tone: "emerald" },
  { label: "考察力", value: 48, delta: 16, tone: "amber" },
  { label: "実験設計", value: 55, delta: 11, tone: "cyan" },
  { label: "新規性説明", value: 41, delta: 6, tone: "rose" },
];

export const weaknessRanking = [
  {
    label: "既存研究との差分",
    count: 9,
    prescription: "Related Workに潰されない一文を先に書く",
  },
  {
    label: "メカニズム説明",
    count: 7,
    prescription: "品質改善 → 損失項 → metric変化で説明する",
  },
  {
    label: "失敗条件",
    count: 5,
    prescription: "rare class / domain bias / noisy signalを必ず検査する",
  },
];

export const papers = [
  {
    id: "ifal",
    title: "Instance-aware Federated Active Learning for Object Detection",
    venue: "Federated Detection",
    status: "training",
    oneLine:
      "clientごとの不確実性とinstance signalを使い、限られたannotation budgetで検出器を改善する。",
    problem:
      "非IIDなfederated detection環境で、どの画像やinstanceにラベルを付けるべきかを選ぶ問題。",
    priorWeakness:
      "画像単位のuncertaintyだけだと、boxごとの難しさやclass imbalanceを拾いきれない。",
    coreMethod:
      "instance-aware scoreでactive learning対象を選び、client間の偏りを考慮してannotation budgetを配分する。",
    mechanism:
      "高価値なinstanceを優先することで、教師信号の密度とrare classの回収率を上げ、detectorのgradientを有効な領域に寄せる。",
    assumptions:
      "uncertainty scoreが実際のannotation valueと相関し、clientごとのdata distributionが完全には崩れていない。",
    limitations:
      "uncertainty calibrationが壊れるdomain shift、極端なrare class、通信制約が強い設定では失敗しやすい。",
    connection:
      "pseudo GT selectionでも、confidence以外のerror/debug signalでbox単位の価値を推定できる可能性がある。",
    score: 68,
  },
  {
    id: "heterogeneity",
    title: "Navigating Data Heterogeneity in Federated Learning",
    venue: "Survey",
    status: "carded",
    oneLine:
      "Federated Learningにおけるdata heterogeneityの種類、失敗原因、代表的な緩和策を整理する。",
    problem:
      "client間の分布差が、最適化・汎化・公平性にどう影響するかを体系的に捉える問題。",
    priorWeakness:
      "単一のnon-IID指標だけでは、label skew, feature skew, concept shiftの差が実験結果に混ざる。",
    coreMethod:
      "heterogeneityのtaxonomyと、それぞれに対するpersonalization / regularization / sampling戦略を整理する。",
    mechanism:
      "分布差を分解して扱うことで、失敗原因に対応した補正を選べる。",
    assumptions:
      "各clientの統計量や評価指標を、privacyと通信量の範囲内で観測できる。",
    limitations:
      "taxonomyが実データの複合的なshiftを完全には分離しない。",
    connection:
      "pseudo label noiseの原因もclientごとに違うため、debug signalをclient-wiseに校正する必要がある。",
    score: 74,
  },
  {
    id: "adansons",
    title: "ADANS: Adaptive Detection Analysis for Neural Systems",
    venue: "Model Debugging",
    status: "questions",
    oneLine:
      "検出器の誤り確率やIoU予測を用いて、失敗しやすいboxやclassを分析する。",
    problem:
      "detectorのconfidenceだけでは、box品質や誤検出リスクを十分に説明できない。",
    priorWeakness:
      "通常のmAP集計は、なぜ壊れたか、どの予測が危険かを局所的に説明しにくい。",
    coreMethod:
      "error_proba, predicted IoU, augmentation stabilityをdebugging signalとして出す。",
    mechanism:
      "confidenceとdebug signalの不一致を拾うことで、見かけ上自信があるが危険なpseudo GTを落とせる。",
    assumptions:
      "debuggerがteacherと同じバイアスに完全には同期していない。",
    limitations:
      "debuggerの校正が悪い場合、pseudo GT selection自体が別のノイズ源になる。",
    connection:
      "Research Dojoの最初の実装タスク候補。confidence-only baselineとのablationが必要。",
    score: 51,
  },
];

export const questions = [
  {
    id: "q1",
    type: "mechanism",
    difficulty: 4,
    question:
      "Large teacherでpseudo GTを作るとstudentの精度が上がる理由を、label quality、loss、mAPの3段階で説明してください。",
    expected: [
      "teacherのbox/class品質がどこで改善するか",
      "studentの損失項にどう影響するか",
      "どのmetricに効くか",
    ],
  },
  {
    id: "q2",
    type: "failure_case",
    difficulty: 5,
    question:
      "confidence thresholdのみのpseudo GT selectionが失敗しそうなデータ分布を2つ挙げ、その理由を述べてください。",
    expected: ["miscalibration", "rare class", "domain bias"],
  },
  {
    id: "q3",
    type: "experiment_design",
    difficulty: 5,
    question:
      "error_probaをpseudo GT selectionへ入れる価値を示す最小ablationを設計してください。",
    expected: ["baseline", "metric", "ablation", "failure analysis"],
  },
];

export const latestReview = {
  score: 46,
  decision: "Weak Reject" as Decision,
  rubric: [
    ["問題設定", 14, 20],
    ["既存研究との差分", 5, 20],
    ["メカニズム説明", 8, 20],
    ["失敗条件", 6, 15],
    ["実験設計", 9, 15],
    ["主張の鋭さ", 4, 10],
  ],
  fatalIssues: [
    "「teacherが強いから」は説明ではなく言い換えで止まっている。",
    "confidenceとdebug signalの差分が、既存研究に対するcontributionとしてまだ弱い。",
    "rare classで壊れる条件への実験が不足している。",
  ],
  nextFix:
    "pseudo label noiseが減る経路を、box quality、class reliability、loss contributionの3段階で書き直す。",
};

export const ideas = [
  {
    title: "debug signalでpseudo GTを選ぶ",
    hypothesis:
      "Teacher confidenceだけでなく、model debugging signalを用いてpseudo GTの信頼度を推定することで、pseudo label noiseを低減しstudent detectorのmAPを改善できる。",
    novelty: [
      "detection error predictorをpseudo GT selectionに使う",
      "class-wise / box-wise reliabilityを導入する",
      "confidenceとdebugger signalの不一致を危険予測に使う",
    ],
    risks: [
      "error_proba自体が不正確な場合",
      "rare classで信頼度推定が不安定な場合",
      "teacherがdomain biasを持つ場合",
    ],
  },
];

export const codexTasks = [
  {
    title: "pseudo GT selection ablationを追加",
    repo: "/path/to/federated-detection-poc",
    status: "running",
    progress: [
      "repo structureを確認中",
      "既存のpseudo GT生成コードを探索中",
      "ablation configを追加中",
    ],
  },
  {
    title: "Review CSV summaryをREADMEに追加",
    repo: "/path/to/federated-detection-poc",
    status: "queued",
    progress: ["実験出力形式を待機中"],
  },
];
