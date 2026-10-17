import { redirect } from "next/navigation";

// Signed-out visitors never reach this: the proxy sends them to /login.
export default function Home() {
  redirect("/dashboard");
}
