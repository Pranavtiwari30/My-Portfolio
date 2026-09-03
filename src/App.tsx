import { SiteNav } from "@/components/site/site-nav"
import { Hero } from "@/components/site/hero"
import { About } from "@/components/site/about"
import { Skills } from "@/components/site/skills"
import { Projects } from "@/components/site/projects"
import { Contact } from "@/components/site/contact"
import { SiteFooter } from "@/components/site/footer"

export function App() {
  return (
    <div className="relative flex min-h-svh flex-col">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  )
}

export default App
