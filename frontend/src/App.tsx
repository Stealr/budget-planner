const plannedFeatures = [
  {
    title: 'Учёт операций',
    description: 'Доходы и расходы с карт и наличных в одном месте.',
  },
  {
    title: 'Лимиты',
    description: 'Планирование трат по категориям на месяц.',
  },
  {
    title: 'Обзор бюджета',
    description: 'Баланс и сводка расходов за выбранный период.',
  },
];

export default function App() {
  return (
    <main className="page">
      <div className="content">
        <p className="eyebrow">Учебный проект · НИТУ МИСИС</p>
        <h1>СтудБюджет</h1>
        <p className="lead">Планируй расходы и держи свои деньги под контролем.</p>
        <p className="status">Это стартовый экран. Возможности ниже пока запланированы.</p>
        <section className="features" aria-label="Запланированные возможности">
          {plannedFeatures.map((feature) => (
            <article className="feature" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
