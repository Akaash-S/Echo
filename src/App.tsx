import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { AuthUser, JournalSession, EndSessionResponse, ReminderStatusResponse, LocationCoords } from './types';
import { EchoApiClient } from './lib/api';
import { AuthScreen } from './components/AuthScreen';
import { JournalChat } from './components/JournalChat';
import { Sidebar } from './components/Sidebar';
import { RetrospectivesModal } from './components/RetrospectivesModal';
import { AdminModal } from './components/AdminModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileView } from './components/ProfileView';
import { LocationGateModal } from './components/LocationGateModal';
import { PanelLeft, Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeView, setActiveView] = useState<'journal' | 'profile'>('journal');
  const [currentSession, setCurrentSession] = useState<JournalSession | null>(null);
  const [previousTheme, setPreviousTheme] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<ReminderStatusResponse | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [isLocationGateOpen, setIsLocationGateOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRetrospectivesOpen, setIsRetrospectivesOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInitializingSession, setIsInitializingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [apiClient, setApiClient] = useState<EchoApiClient>(
    () => new EchoApiClient('')
  );

  // Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Journaler',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            token,
          };
          setCurrentUser(authUser);
          const client = new EchoApiClient(token);
          setApiClient(client);
          
          // Fetch in-app reminder status asynchronously
          client.getReminderStatus()
            .then((res) => setReminderStatus(res))
            .catch((err) => console.warn('Reminder check failed:', err));

          // Mandatory Location Check (§1)
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const coords: LocationCoords = {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                };
                setUserLocation(coords);
                startNewSessionWithClient(client, authUser.uid, coords);
              },
              () => {
                // If permission is pending or denied, block with mandatory modal
                setIsLocationGateOpen(true);
              },
              { timeout: 5000 }
            );
          } else {
            setIsLocationGateOpen(true);
          }
        } catch (err) {
          console.error('Failed to get user token on auth state change:', err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setCurrentSession(null);
        setUserLocation(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLocationAcquired = async (coords: LocationCoords) => {
    setUserLocation(coords);
    setIsLocationGateOpen(false);

    if (apiClient && currentUser) {
      if (currentSession && currentSession.sessionId && !currentSession.location) {
        try {
          await apiClient.updateSessionLocation(currentSession.sessionId, coords);
          setCurrentSession({
            ...currentSession,
            location: coords,
          });
        } catch (err) {
          console.warn('Failed to update session location:', err);
        }
      } else if (!currentSession || !currentSession.sessionId) {
        startNewSessionWithClient(apiClient, currentUser.uid, coords);
      }
    }
  };

  const startNewSessionWithClient = async (client: EchoApiClient, uid: string, location?: LocationCoords) => {
    // 1. INSTANT ZERO-LATENCY SHELL: Clear old session immediately and mount fresh empty shell
    setActiveView('journal');
    setIsInitializingSession(true);
    setSessionError(null);
    setPreviousTheme(null);

    const activeLoc = location || userLocation;

    // Provide instant UI response with empty session shell
    const optimisticEmptySession: JournalSession = {
      sessionId: '',
      userId: uid,
      startedAt: new Date().toISOString(),
      endedAt: null,
      messages: [],
      summary: null,
      extractedTheme: null,
      followUpQuestion: null,
      followUpAsked: false,
      followUpReferencedNext: false,
      location: activeLoc || null,
    };
    setCurrentSession(optimisticEmptySession);

    // If location is missing, trigger mandatory gate
    if (!activeLoc) {
      setIsLocationGateOpen(true);
      setIsInitializingSession(false);
      return;
    }

    try {
      const startRes = await client.startSession(activeLoc);
      const newSession: JournalSession = {
        sessionId: startRes.sessionId,
        userId: uid,
        startedAt: startRes.startedAt,
        endedAt: null,
        messages: [
          {
            role: 'model',
            text: startRes.openingMessage,
            timestamp: startRes.startedAt,
          },
        ],
        summary: null,
        extractedTheme: null,
        followUpQuestion: null,
        followUpAsked: false,
        followUpReferencedNext: false,
        location: startRes.location ? { lat: startRes.location.lat, lng: startRes.location.lng } : activeLoc,
      };
      setCurrentSession(newSession);
      setPreviousTheme(startRes.previousTheme);
    } catch (err: any) {
      console.error('Failed to start session with backend API', err);
      // Bug 1 fix: Do NOT fabricate fake local sessions! Set explicit error state
      setCurrentSession(null);
      setSessionError(err.message || "Couldn't start a session — please ensure the backend is running and retry.");
    } finally {
      setIsInitializingSession(false);
    }
  };

  const handleStartNewSession = (location?: LocationCoords) => {
    if (apiClient && currentUser) {
      setIsSidebarOpen(false);
      setActiveView('journal');
      startNewSessionWithClient(apiClient, currentUser.uid, location || userLocation || undefined);
    }
  };

  const handleRetrySession = () => {
    if (apiClient && currentUser) {
      startNewSessionWithClient(apiClient, currentUser.uid, userLocation || undefined);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!apiClient) return;
    try {
      await apiClient.deleteSession(sessionId);
      if (currentSession?.sessionId === sessionId) {
        if (currentUser) {
          startNewSessionWithClient(apiClient, currentUser.uid, userLocation || undefined);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSessionUpdated = (updatedSession: JournalSession) => {
    setCurrentSession(updatedSession);
  };

  const handleEndSessionSuccess = (analysis: EndSessionResponse) => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        summary: analysis.summary,
        extractedTheme: analysis.extractedTheme,
        followUpQuestion: analysis.followUpQuestion,
        endedAt: analysis.endedAt,
        followUpAsked: analysis.followUpAsked,
      });
    }
  };

  const handleSelectPastSession = (session: JournalSession) => {
    setCurrentSession(session);
    setPreviousTheme(null);
    setSessionError(null);
    setIsSidebarOpen(false);
    setActiveView('journal');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setCurrentUser(null);
    setCurrentSession(null);
    setSessionError(null);
    setActiveView('journal');
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen bg-stone-900 text-stone-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="h-screen w-screen bg-stone-900 text-stone-100 flex overflow-hidden font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        api={apiClient}
        currentSessionId={currentSession?.sessionId || null}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectSession={handleSelectPastSession}
        onNewSession={() => handleStartNewSession()}
        onDeleteSession={handleDeleteSession}
        onOpenProfile={() => {
          setActiveView('profile');
          setIsSidebarOpen(false);
        }}
        onOpenRetrospectives={() => setIsRetrospectivesOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        userEmail={currentUser.email}
        displayName={currentUser.displayName}
        photoURL={currentUser.photoURL}
      />

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Mobile Header / Sidebar Toggle */}
        <div className="lg:hidden h-12 border-b border-stone-800 px-4 flex items-center justify-between bg-stone-950 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg"
            title="Open sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <span className="font-serif text-base text-stone-200 font-normal">Echo</span>
          <div className="w-5" />
        </div>

        {/* Dynamic View: Active Reflection vs. Full Profile Page */}
        {activeView === 'journal' ? (
          <JournalChat
            api={apiClient}
            currentSession={currentSession}
            previousTheme={previousTheme}
            reminderStatus={reminderStatus}
            isInitializing={isInitializingSession}
            sessionError={sessionError}
            onSessionUpdated={handleSessionUpdated}
            onEndSessionSuccess={handleEndSessionSuccess}
            onStartNewSession={handleStartNewSession}
            onRetrySession={handleRetrySession}
          />
        ) : (
          <ProfileView
            api={apiClient}
            user={currentUser}
            onBackToJournal={() => setActiveView('journal')}
            onSelectSession={handleSelectPastSession}
            onStartNewSession={() => handleStartNewSession()}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Mandatory Location Permission Gate */}
      <LocationGateModal
        isOpen={isLocationGateOpen && Boolean(currentUser)}
        onLocationAcquired={handleLocationAcquired}
      />

      {/* Place Retrospectives Modal (§1) */}
      <RetrospectivesModal
        api={apiClient}
        isOpen={isRetrospectivesOpen}
        onClose={() => setIsRetrospectivesOpen(false)}
      />

      {/* Admin Aggregates Modal (§3) */}
      <AdminModal
        api={apiClient}
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        user={currentUser}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
