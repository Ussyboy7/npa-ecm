import { redirect } from "next/navigation";

const VALID_SUBTABS = new Set(["users", "roles", "matrix", "assistants"]);

type UsersRolesRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Users & Roles now lives under Organization → People & access. */
export default async function UsersRolesRedirectPage({
  searchParams,
}: UsersRolesRedirectPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const subtab =
    requested && VALID_SUBTABS.has(requested) ? requested : "users";

  redirect(`/admin/organization?tab=people&subtab=${subtab}`);
}
