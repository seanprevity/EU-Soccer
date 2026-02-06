import Landing from "./(nondashboard)/landing/page";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <main className={"h-full w-full flex-col dark:bg-gray-900"}>
        <Landing />
      </main>
    </div>
  );
}
