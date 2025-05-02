import React from 'react';
import Link from 'next/link';
import { MapPin, Film, Users, Globe, Compass, HeartHandshake, Calendar } from 'lucide-react';

export const metadata = {
    title: "About | Mapping Queer Cinema",
    description: "A living archive of resistance, memory, and community mapping queer cinema across the globe",
  };
  
const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="relative py-20 px-4 overflow-hidden bg-gradient-to-b from-primary/10 to-background">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_60%,rgba(253,119,198,0.15),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(151,119,253,0.15),transparent_50%)]"></div>
        </div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center items-center mb-6">
              <MapPin className="text-primary h-8 w-8 mr-2" />
              <h1 className="text-4xl md:text-5xl font-bold">Mapping Queer Cinema</h1>
            </div>
            <h2 className="text-xl md:text-2xl mb-6 text-muted-foreground">
              A Living Archive of Resistance, Memory, and Community
            </h2>
            <p className="text-lg mb-8">
              Reimagining how we document, analyze, and celebrate queer cinema through interactive digital mapping.
            </p>
          </div>
        </div>
      </section>

      {/* Vision section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Project Vision</h2>
              <p className="mb-4">
                Mapping Queer Cinema is a digital archive and collaborative platform that reimagines how we document, analyze, and celebrate queer cinema. By placing films on an interactive global map, we challenge the erasure of queer narratives from dominant histories and geographies.
              </p>
              <p className="mb-4">
                This project asks: Where does queer cinema live? How does it move across borders, redefine spaces, and create new worlds?
              </p>
              <p className="mb-4">
                Our map is more than a database—it's a collective act of resistance. By crowdsourcing film locations (where stories are set, filmed, or imagined), we visualize the sprawling, often hidden networks of queer creativity.
              </p>
              <p>
                This spatial approach reveals how queer cinema disrupts heteronormative timelines and colonial boundaries, offering what José Esteban Muñoz called "a horizon of possibility" for futures rooted in solidarity and liberation.
              </p>
            </div>
            <div className="bg-muted p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Compass className="h-5 w-5 mr-2 text-primary" />
                Why This Matters Now
              </h3>
              <p className="mb-3">
                Queer stories are under threat. With rising global censorship, anti-LGBTQ+ legislation, and the fragility of physical archives, digital preservation becomes urgent.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <span className="text-primary font-medium">1</span>
                  </div>
                  <p>Preserves at-risk cinematic histories, from underground classics to diasporic narratives.</p>
                </li>
                <li className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <span className="text-primary font-medium">2</span>
                  </div>
                  <p>Connects regional queer film movements (e.g., New Queer Cinema in the U.S., the "Third Cinema" resistance in Latin America).</p>
                </li>
                <li className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <span className="text-primary font-medium">3</span>
                  </div>
                  <p>Amplifies marginalized voices, prioritizing films by trans filmmakers, queer people of color, and Global South creators.</p>
                </li>
                <li className="flex items-start">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <span className="text-primary font-medium">4</span>
                  </div>
                  <p>Challenges Eurocentric frameworks by decentralizing Hollywood and highlighting films from places like Nigeria's Nollywood or India's Parallel Cinema.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works: A Community-Driven Model</h2>
            <p className="max-w-2xl mx-auto text-lg">
              This archive thrives on community participation. Whether you're a film scholar, a casual viewer, or a queer person seeking connection, your contributions matter.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card border rounded-lg p-6 flex flex-col h-full">
              <MapPin className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Pin a Film</h3>
              <p className="text-muted-foreground">
                Place a marker where a film is set, filmed, or symbolically tied to (e.g., Moonlight in Miami, Portrait of a Lady on Fire on the French coast).
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6 flex flex-col h-full">
              <Film className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Add Context</h3>
              <p className="text-muted-foreground">
                Share why the location matters. Was it a site of protest? A clandestine screening space? A childhood bedroom where you reclaimed your identity? The options are endless, what matters is why YOU consider this film "queer".
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6 flex flex-col h-full">
              <Globe className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Tag Themes</h3>
              <p className="text-muted-foreground">
                Use keywords like "trans resilience," "AIDS activism," or "queer rurality" to connect films across regions.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6 flex flex-col h-full">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Curate & Edit</h3>
              <p className="text-muted-foreground">
                Suggest edits, add citations, or link to related films, creating dialogues between entries.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6 flex flex-col h-full">
              <Calendar className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Temporal Layers</h3>
              <p className="text-muted-foreground">
                Trace queer cinema's evolution alongside political movements like Pride marches and decriminalization milestones.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6 flex flex-col h-full">
              <HeartHandshake className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Join the Movement</h3>
              <p className="text-muted-foreground">
                Together, we're not just mapping films—we're charting a world where queer stories are unapologetically visible, resilient, and boundless.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Theoretical framework */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Theoretical Framework</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Queer Temporality & Spatial Justice</h3>
              <p className="mb-4">
                This project draws from Jack Halberstam's concept of "queer time"—rejecting linear narratives of progress—to show how films like Tangerine (shot on iPhones, disrupting Hollywood production norms) or Funeral Parade of Roses (1969 Japanese New Wave) create their own timelines.
              </p>
              <p>
                By mapping these works spatially, we expose how queer cinema reclaims sites of trauma (e.g., police raids in Pride) and transforms them into spaces of collective memory.
              </p>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Digital Archiving as Activism</h3>
              <p className="mb-3">Unlike traditional archives, our platform:</p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <span className="text-primary text-xs font-medium">•</span>
                  </div>
                  <p>Democratizes curation: No gatekeepers—users decide what counts as "queer cinema."</p>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <span className="text-primary text-xs font-medium">•</span>
                  </div>
                  <p>Embodies fluidity: Entries evolve as users add layers of context.</p>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                    <span className="text-primary text-xs font-medium">•</span>
                  </div>
                  <p>Uses open-source tools: Built with accessibility in mind, ensuring the archive remains free and adaptable.</p>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted p-8 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-center">Guiding Principles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border rounded-lg p-4 text-center">
                <h4 className="font-medium mb-2">Radical Inclusivity</h4>
                <p className="text-sm text-muted-foreground">Prioritize films excluded from mainstream canons, or films that have had a profound impact on your identity</p>
              </div>
              <div className="bg-card border rounded-lg p-4 text-center">
                <h4 className="font-medium mb-2">Nuanced Geography</h4>
                <p className="text-sm text-muted-foreground">A film can have multiple pins to represent complex geographies.</p>
              </div>
              <div className="bg-card border rounded-lg p-4 text-center">
                <h4 className="font-medium mb-2">Cite Your Sources</h4>
                <p className="text-sm text-muted-foreground">Credit filmmakers, scholars, and community knowledge.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future section */}
      <section className="py-16 px-4 bg-gradient-to-t from-primary/10 to-background">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Future Horizons</h2>
          <div className="max-w-2xl mx-auto mb-12">
            <p className="mb-6">
              We're expanding to include temporal layers, multilingual accessibility, oral histories, and more.
            </p>
            <p className="text-lg font-medium">
              Start exploring. Start contributing. The map is yours to shape.
            </p>
          </div>

          <div className="inline-block">
            <Link href="/auth" passHref>
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-md font-medium text-lg transition-colors">
                    Join the Movement
                </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;