import { create } from 'zustand';

const useListingsStore = create((set) => ({
  nearbyListings: [],
  myListings: [],
  selectedListing: null,
  isLoading: false,

  setNearbyListings: (listings) => set({ nearbyListings: listings }),
  setMyListings: (listings) => set({ myListings: listings }),
  setSelectedListing: (listing) => set({ selectedListing: listing }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

export default useListingsStore;
