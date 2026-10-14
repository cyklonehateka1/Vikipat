import type { DimensionUnit } from '../../types/pricing';

export type ArtworkOption = 'upload' | 'link' | 'design_service' | 'later';

/** The chosen size. Text fields keep exactly what was typed so errors can show. */
export type SizeState = {
  /** A preset label from outcomes.ts, or 'custom'. */
  preset: string;
  widthText: string;
  heightText: string;
  unit: DimensionUnit;
};

export type ArtworkState = {
  option: ArtworkOption;
  url: string;
  name: string;
  link: string;
  notes: string;
};
