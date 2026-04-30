import { Document, Schema, model } from 'mongoose';

interface HomeCarouselConfig {
  tabacoImageUrl: string;
  vapersImageUrl: string;
  parafernaliaImageUrl: string;
}

export interface ISiteConfig extends Document {
  key: string;
  homeCarousel: HomeCarouselConfig;
}

const siteConfigSchema = new Schema<ISiteConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'main'
    },
    homeCarousel: {
      tabacoImageUrl: {
        type: String,
        default: ''
      },
      vapersImageUrl: {
        type: String,
        default: ''
      },
      parafernaliaImageUrl: {
        type: String,
        default: ''
      }
    }
  },
  {
    timestamps: true
  }
);

export const SiteConfig = model<ISiteConfig>('SiteConfig', siteConfigSchema);
