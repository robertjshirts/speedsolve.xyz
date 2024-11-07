// app/p/page.tsx


export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const response = await fetch(`https://api.speedsolve.xyz/profile/${username}`);
  const data = await response.json();
  return <div>{JSON.stringify(data)}</div>;
}