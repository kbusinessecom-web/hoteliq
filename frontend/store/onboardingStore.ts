import { create } from 'zustand';
// Use explicit CJS path to avoid Metro bundler picking up ESM version (import.meta issue)
import { persist, createJSONStorage } from 'zustand/middleware.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  currentStep: number;
  isCompleted: boolean;
  
  // Step 1: Hotel Info
  hotelName: string;
  hotelCity: string;
  roomCount: number;
  classification: string;
  seasonType: string;
  language: string;
  
  // Step 2: Channels
  connectedChannels: string[];
  
  // Step 3: AI Training
  trainingDocuments: string[];
  
  // Step 4: Team
  teamMembers: Array<{ email: string; role: string }>;
  
  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateHotelInfo: (info: Partial<OnboardingState>) => void;
  addChannel: (channel: string) => void;
  removeChannel: (channel: string) => void;
  addDocument: (doc: string) => void;
  addTeamMember: (member: { email: string; role: string }) => void;
  removeTeamMember: (email: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((
  persist(
    (set, get) => ({
      currentStep: 1,
      isCompleted: false,
      
      // Step 1 defaults
      hotelName: '',
      hotelCity: '',
      roomCount: 0,
      classification: '4★',
      seasonType: 'Annuel',
      language: 'fr',
      
      // Step 2 defaults
      connectedChannels: [],
      
      // Step 3 defaults
      trainingDocuments: [],
      
      // Step 4 defaults
      teamMembers: [],
      
      setStep: (step: number) => set({ currentStep: step }),
      
      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 4) {
          set({ currentStep: currentStep + 1 });
        }
      },
      
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      
      updateHotelInfo: (info) => set(info),
      
      addChannel: (channel) => {
        const { connectedChannels } = get();
        if (!connectedChannels.includes(channel)) {
          set({ connectedChannels: [...connectedChannels, channel] });
        }
      },
      
      removeChannel: (channel) => {
        const { connectedChannels } = get();
        set({ connectedChannels: connectedChannels.filter(c => c !== channel) });
      },
      
      addDocument: (doc) => {
        const { trainingDocuments } = get();
        set({ trainingDocuments: [...trainingDocuments, doc] });
      },
      
      addTeamMember: (member) => {
        const { teamMembers } = get();
        set({ teamMembers: [...teamMembers, member] });
      },
      
      removeTeamMember: (email) => {
        const { teamMembers } = get();
        set({ teamMembers: teamMembers.filter(m => m.email !== email) });
      },
      
      completeOnboarding: () => set({ isCompleted: true }),
      
      resetOnboarding: () => set({
        currentStep: 1,
        isCompleted: false,
        hotelName: '',
        hotelCity: '',
        roomCount: 0,
        classification: '4★',
        seasonType: 'Annuel',
        language: 'fr',
        connectedChannels: [],
        trainingDocuments: [],
        teamMembers: [],
      }),
    }),
    {
      name: 'hoteliq-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
));
