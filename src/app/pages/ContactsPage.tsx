import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus, Star, MessageCircle, Phone, Video } from 'lucide-react';
import { contactsApi, Contact } from '../api/contacts';
import { VerificationBadge } from '../components/VerificationBadge';
import { MobileNav } from '../components/MobileNav';
import { toast } from 'sonner';

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const contactsData = await contactsApi.getContacts();
      setContacts(contactsData);
    } catch (error: any) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = searchQuery
    ? contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  const favoriteContacts = filteredContacts.filter(c => c.isFavorite);
  const regularContacts = filteredContacts.filter(c => !c.isFavorite);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-foreground">Contacts</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            <UserPlus className="w-5 h-5" />
            <span className="hidden md:inline">Add Contact</span>
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Favorites */}
            {favoriteContacts.length > 0 && (
              <div className="mb-4">
                <div className="px-4 py-2 bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Favorites</p>
                </div>
                {favoriteContacts.map(contact => (
                  <ContactItem key={contact.id} contact={contact} />
                ))}
              </div>
            )}

            {/* All Contacts */}
            {regularContacts.length > 0 ? (
              <div>
                <div className="px-4 py-2 bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">All Contacts</p>
                </div>
                {regularContacts.map(contact => (
                  <ContactItem key={contact.id} contact={contact} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <UserPlus className="w-16 h-16 mb-4 opacity-50" />
                <p>No contacts found</p>
              </div>
            )}
          </>
        )}
      </div>

      <MobileNav />
    </div>
  );
}

function ContactItem({ contact }: { contact: Contact }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-muted transition-colors border-b border-border">
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-primary text-lg">{contact.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--online-indicator)] border-2 border-card rounded-full"></div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="truncate text-foreground">{contact.name}</h3>
          <VerificationBadge role={contact.role} size="sm" />
          {contact.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
        </div>
        <p className="text-sm text-muted-foreground truncate">{contact.bio || contact.email}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => navigate('/chats')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Message"
        >
          <MessageCircle className="w-5 h-5 text-primary" />
        </button>
        <button
          onClick={() => navigate(`/call/voice/${contact.id}`)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Voice Call"
        >
          <Phone className="w-5 h-5 text-primary" />
        </button>
        <button
          onClick={() => navigate(`/call/video/${contact.id}`)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Video Call"
        >
          <Video className="w-5 h-5 text-primary" />
        </button>
      </div>
    </div>
  );
}
