export type Lang = 'en' | 'ar'

export type Localized = { en: string; ar: string }
export type LocalizedOptional = { en: string | null; ar: string | null }

export type Tag = 'new' | 'popular' | 'spicy' | 'vegetarian' | 'vegan' | 'sharing' | 'gluten_free' | 'nuts'

export type Product = {
  id: number
  code: number | null
  name: Localized
  description: LocalizedOptional
  price: number
  /** Offer price; when set the regular price is shown crossed out. */
  sale_price: number | null
  calories: number | null
  tags: Tag[]
  image: string | null
  featured: boolean
}

/** A promotion shown on the menu home. */
export type Offer = {
  id: number
  title: Localized
  description: LocalizedOptional
  badge: LocalizedOptional
  image: string | null
  price: number | null
  old_price: number | null
  ends_at: string | null
  product_ids: number[]
}

export type Category = {
  id: number
  slug: string
  name: Localized
  description: LocalizedOptional
  icon: string
  image: string | null
  products: Product[]
}

/** A home-page card (The Kitchen, The Café…) holding the sections shown as tabs. */
export type Group = {
  id: number
  slug: string
  name: Localized
  description: LocalizedOptional
  icon: string
  image: string | null
  sections: Category[]
}

export type Settings = {
  name_en: string
  name_ar: string
  tagline_en: string | null
  tagline_ar: string | null
  about_en: string | null
  about_ar: string | null
  motto_en: string | null
  motto_ar: string | null
  currency_en: string
  currency_ar: string
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  facebook: string | null
  address_en: string | null
  address_ar: string | null
  hours_en: string | null
  hours_ar: string | null
  map_url: string | null
  note_en: string | null
  note_ar: string | null
  /** Uploaded logo; when null the built-in animated logo is used. */
  logo_url: string | null
}

export type Menu = {
  version: string
  settings: Settings
  groups: Group[]
  offers: Offer[]
}

/* Admin (flat) shapes */

export type AdminCategory = {
  id: number
  parent_id: number | null
  slug: string
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  icon: string
  image: string | null
  sort_order: number
  is_active: boolean
  products_count?: number
}

export type AdminProduct = {
  id: number
  category_id: number
  code: number | null
  name_en: string
  name_ar: string
  description_en: string | null
  description_ar: string | null
  price: number
  sale_price: number | null
  calories: number | null
  tags: Tag[]
  image: string | null
  is_featured: boolean
  is_available: boolean
  sort_order: number
}

export type AdminOffer = {
  id: number
  title_en: string
  title_ar: string
  description_en: string | null
  description_ar: string | null
  badge_en: string | null
  badge_ar: string | null
  image: string | null
  price: number | null
  old_price: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  is_running: boolean
  sort_order: number
  product_ids: number[]
}
