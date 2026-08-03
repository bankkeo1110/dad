export function isValidAdminSession(cookieValue: string | undefined): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  return Boolean(adminPassword) && cookieValue === adminPassword;
}
