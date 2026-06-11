export default function FrekwencjaBadge({ value }: { value: number }) {
  const cls =
    value >= 80
      ? "text-green-700"
      : value >= 50
        ? "text-amber-700"
        : "text-red-700";
  return <span className={`font-semibold ${cls}`}>{value}%</span>;
}
