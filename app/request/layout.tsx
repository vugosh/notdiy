export default function RequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bu səhifə üçün ayrıca header lazım deyil.
  // Əsas sabit header artıq app/layout.tsx içindədir
  // və bütün səhifələrdə avtomatik görünəcək.

  return <>{children}</>;
}