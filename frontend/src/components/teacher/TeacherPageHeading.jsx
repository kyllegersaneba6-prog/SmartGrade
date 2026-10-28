const TeacherPageHeading = ({ eyebrow = 'Overview', title, description, actions }) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-md sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">{eyebrow}</p>
      <h1 className="text-xl font-extrabold tracking-tight text-sidebar sm:text-2xl">{title}</h1>
      {description && <p className="mt-1.5 text-xs text-gray-600 sm:text-sm">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default TeacherPageHeading;
