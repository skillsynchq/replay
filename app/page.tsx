import { Nav } from "./components/nav";
import { Hero } from "./components/hero";
import { HowItWorks } from "./components/how-it-works";
import { ConversationPreview } from "./components/conversation-preview";
import { Trust } from "./components/trust";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <div id="top" className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ConversationPreview />
        <Trust />
      </main>
      <Footer />
    </div>
  );
}
