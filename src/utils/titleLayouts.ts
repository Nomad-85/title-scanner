export interface TitleLayout {
  state: string;
  vinRegion: {
    x: number;      // Percentage from left
    y: number;      // Percentage from top
    width: number;  // Percentage of page width
    height: number; // Percentage of page height
  };
}

export const titleLayouts: TitleLayout[] = [
  {
    state: 'TX',
    vinRegion: {
      x: 10,      // 10% from left
      y: 30,      // 30% from top
      width: 40,  // 40% of page width
      height: 8   // 8% of page height
    }
  },
  // Add more states here...
  {
    state: 'CA',
    vinRegion: {
      x: 15,
      y: 25,
      width: 35,
      height: 10
    }
  }
]; 