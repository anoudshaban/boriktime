<?php

/*
|--------------------------------------------------------------------------
| Menu import defaults
|--------------------------------------------------------------------------
|
| The menu spreadsheet only carries English section titles, so the Arabic
| titles, icons and short taglines for each section live here. Keys are the
| section titles exactly as they appear in the spreadsheet (case-insensitive).
| Icons map to the illustrated set in frontend/src/components/icons.
|
*/

return [

    'source' => database_path('data/menu.xlsx'),

    /*
    | Groups shown as the large cards on the menu home. Each lists the
    | spreadsheet section titles it contains. Sections not listed in any group
    | stay at the top level. Changes made later in the admin panel are kept.
    */
    'groups' => [
        [
            'slug' => 'kitchen',
            'name_en' => 'The Kitchen',
            'name_ar' => 'المطبخ',
            'description_en' => 'Breakfast, börek, mezze and the kitchen.',
            'description_ar' => 'فطور، بوريك، مقبلات وأطباق المطبخ.',
            'icon' => 'cutlery',
            'sections' => ['breakfast', 'bakery', 'borek trays', 'salad', 'cold mezzah', 'hot mezzah', 'fattat', 'main course'],
        ],
        [
            'slug' => 'cafe',
            'name_en' => 'The Café',
            'name_ar' => 'المقهى',
            'description_en' => 'Turkish coffee, fresh juices and cool drinks.',
            'description_ar' => 'قهوة تركية، عصائر طازجة ومشروبات باردة.',
            'icon' => 'coffee',
            'sections' => ['cold drinks', 'hot drinks'],
        ],
        [
            'slug' => 'sweets',
            'name_en' => 'Sweets',
            'name_ar' => 'الحلويات',
            'description_en' => 'Something sweet to finish.',
            'description_ar' => 'ختامها حلو.',
            'icon' => 'dessert',
            'sections' => ['dessert'],
        ],
    ],

    'categories' => [
        'breakfast' => [
            'slug' => 'breakfast',
            'name_en' => 'Breakfast',
            'name_ar' => 'الفطور',
            'description_en' => 'A generous Turkish-Levantine spread to share.',
            'description_ar' => 'سفرة فطور تركية شامية للمشاركة.',
            'icon' => 'breakfast',
        ],
        'bakery' => [
            'slug' => 'bakery',
            'name_en' => 'Bakery',
            'name_ar' => 'المخبوزات',
            'description_en' => 'Börek and pies, baked fresh through the day.',
            'description_ar' => 'بوريك وفطائر تُخبز طازجة طوال اليوم.',
            'icon' => 'borek',
        ],
        'borek trays' => [
            'slug' => 'borek-trays',
            'name_en' => 'Börek Trays',
            'name_ar' => 'صواني البوريك',
            'description_en' => 'Whole trays of börek to take home or share: 12, 24 or 40 pieces.',
            'description_ar' => 'صواني بوريك للبيت أو للمشاركة: 12 أو 24 أو 40 قطعة.',
            'icon' => 'borek',
        ],
        'salad' => [
            'slug' => 'salads',
            'name_en' => 'Salads',
            'name_ar' => 'السلطات',
            'description_en' => 'Crisp, bright and made to order.',
            'description_ar' => 'طازجة ومحضّرة عند الطلب.',
            'icon' => 'salad',
        ],
        'cold mezzah' => [
            'slug' => 'cold-mezze',
            'name_en' => 'Cold Mezze',
            'name_ar' => 'المقبلات الباردة',
            'description_en' => 'Classic dips and plates for the middle of the table.',
            'description_ar' => 'مقبلات كلاسيكية لمنتصف الطاولة.',
            'icon' => 'mezze',
        ],
        'hot mezzah' => [
            'slug' => 'hot-mezze',
            'name_en' => 'Hot Mezze',
            'name_ar' => 'المقبلات الساخنة',
            'description_en' => 'Straight from the pan and the grill.',
            'description_ar' => 'من المقلاة والشواية مباشرة.',
            'icon' => 'pan',
        ],
        'fattat' => [
            'slug' => 'fatteh',
            'name_en' => 'Fatteh',
            'name_ar' => 'الفتات',
            'description_en' => 'Layers of crisp bread, warm yoghurt and toppings.',
            'description_ar' => 'طبقات من الخبز المحمص واللبن الدافئ.',
            'icon' => 'bowl',
        ],
        'main course' => [
            'slug' => 'main-course',
            'name_en' => 'Main Course',
            'name_ar' => 'الأطباق الرئيسية',
            'description_en' => 'Clay-pot fakhara and Turkish kebab classics.',
            'description_ar' => 'فخارات وأطباق الكباب التركية.',
            'icon' => 'pot',
        ],
        'cold drinks' => [
            'slug' => 'cold-drinks',
            'name_en' => 'Cold Drinks',
            'name_ar' => 'المشروبات الباردة',
            'description_en' => 'Fresh juices, ayran and coolers.',
            'description_ar' => 'عصائر طازجة وعيران ومشروبات منعشة.',
            'icon' => 'juice',
        ],
        'hot drinks' => [
            'slug' => 'hot-drinks',
            'name_en' => 'Hot Drinks',
            'name_ar' => 'المشروبات الساخنة',
            'description_en' => 'Turkish coffee, espresso and tea.',
            'description_ar' => 'قهوة تركية وإسبريسو وشاي.',
            'icon' => 'coffee',
        ],
        'dessert' => [
            'slug' => 'desserts',
            'name_en' => 'Desserts',
            'name_ar' => 'الحلويات',
            'description_en' => 'Something sweet to finish.',
            'description_ar' => 'ختامها حلو.',
            'icon' => 'dessert',
        ],
    ],

    // Dishes highlighted in the "Chef's picks" strip on first import (matched on English name).
    'featured' => [
        'Borek ALL / 3Pcs with Turkish Tea',
        'Doner Borek Beef',
        'Iskandar Kebab',
        'Ali Nazik',
        'Hardal Beef Steak with Fries',
        'Osmaliyya with Fresh Cream',
    ],

    // Tags applied on first import (matched on English name).
    'tags' => [
        'Breakfast / 2 Persons' => ['sharing'],
        'Mix Cold Mezzah 5 Types' => ['sharing'],
        'Hot Potato' => ['spicy'],
    ],

    'default_settings' => [
        'name_en' => 'Börek Time',
        'name_ar' => 'بوريك تايم',
        'tagline_en' => 'Restaurant & Cafe · Since 2020',
        'tagline_ar' => 'مطعم ومقهى · منذ 2020',
        'about_en' => null,
        'about_ar' => null,
        'motto_en' => null,
        'motto_ar' => null,
        'currency_en' => 'JD',
        'currency_ar' => 'د.أ',
        'phone' => null,
        'whatsapp' => null,
        'instagram' => null,
        'facebook' => null,
        'address_en' => null,
        'address_ar' => null,
        'hours_en' => null,
        'hours_ar' => null,
        'map_url' => null,
        'note_en' => 'Prices are in Jordanian Dinar.',
        'note_ar' => 'الأسعار بالدينار الأردني.',
        // Online table booking
        'reservations_enabled' => '1',
        'reservation_open' => '12:00',
        'reservation_last' => '23:00',
        'reservation_interval' => '30',
        'reservation_max_guests' => '20',
    ],

];
