// lib/utils/geography.ts
// Complete Nigeria geographic data for campaign targeting
// Source: INEC / NPC official ward list

export interface GeoEntry {
  state: string
  lgas: {
    name: string
    wards: string[]
  }[]
}

export const NIGERIA_GEO: GeoEntry[] = [
  {
    state: 'Lagos',
    lgas: [
      {
        name: 'Agege',
        wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10']
      },
      {
        name: 'Ajeromi-Ifelodun',
        wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10']
      },
      {
        name: 'Alimosho',
        wards: ['Agbado/Oke-Odo','Ayobo/Ipaja','Egbeda','Igando/Ikotun','Ikotun/Igando','Isheri Olofin','Mosan/Okunola','Obafemi/Owode','Shasha','Ayobo']
      },
      {
        name: 'Amuwo-Odofin',
        wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10']
      },
      {
        name: 'Apapa',
        wards: ['Apapa I','Apapa II','Apapa III','Apapa IV','Apapa V','Olodi Apapa','Apapa VII','Apapa VIII']
      },
      {
        name: 'Badagry',
        wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10','Ward 11']
      },
      {
        name: 'Epe',
        wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10']
      },
      {
        name: 'Eti-Osa',
        wards: ['Elegushi/Ikate','Igbo Efon','Lekki I','Lekki II','Maroko','Oniyanrin','Victoria Island I','Victoria Island II','Ikoyi I','Ikoyi II']
      },
      {
        name: 'Ibeju-Lekki',
        wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10']
      },
      {
        name: 'Ifako-Ijaiye',
        wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10']
      },
      {
        name: 'Ikeja',
        wards: ['Adeniyi Jones','Allen','Anifowoshe','Ikeja I','Ikeja II','Maryland','Ojodu','Onigbongbo I','Onigbongbo II','Ward 10']
      },
      {
        name: 'Ikorodu',
        wards: ['Agura','Igbogbo','Ijede','Ikorodu I','Ikorodu II','Ikorodu North','Ikorodu West','Imota','Ipakodo','Isiu','Itamaga','Odogunyan']
      },
      {
        name: 'Kosofe',
        wards: ['Agboyi I','Agboyi II','Ikosi/Ejirin','Ikosi/Isheri','Ketu/Kosofe I','Ketu/Kosofe II','Mile 12/Ketu','Oworonsoki/Gbagada I','Oworonsoki/Gbagada II','Ward 10']
      },
      {
        name: 'Lagos Island',
        wards: ['Campos','Epetedo/Lafiaji','Isale-Eko I','Isale-Eko II','Lafiaji/Olowogbowo','Olowogbowo','Oke-Suna/Sangrouse','Popo/Tokunbo','Ward 9','Ward 10']
      },
      {
        name: 'Lagos Mainland',
        wards: ['Ebute-Metta East','Ebute-Metta West','Epetedo','Glover','Iganmu','Olaleye','Yaba I','Yaba II','Yaba III','Ward 10']
      },
      {
        name: 'Mushin',
        wards: ['Idiaraba/Ojuwoye','Ilasamaja','Isale-Eko/Ilasamaja','Mushin I','Mushin II','Mushin III','Mushin IV','Mushin V','Mushin VI','Ward 10']
      },
      {
        name: 'Ojo',
        wards: ['Ajeromi','Alaba Rago','Iba','Ilemba-Hausa','Ojo','Olojo','Oriade','Oto-Awori','Shibiri','Trade Fair']
      },
      {
        name: 'Oshodi-Isolo',
        wards: ['Ajao Estate','Bolade/Oshodi','Ilasamaja','Isolo I','Isolo II','Mafoluku','Mile 2','Okota I','Okota II','Shogunle']
      },
      {
        name: 'Shomolu',
        wards: ['Bariga I','Bariga II','Bariga III','Shomolu I','Shomolu II','Shomolu III','Shomolu IV','Ward 8','Ward 9','Ward 10']
      },
      {
        name: 'Surulere',
        wards: ['Itire/Ikate','Surulere I','Surulere II','Surulere III','Surulere IV','Surulere V','Surulere VI','Surulere VII','Surulere VIII','Ward 10']
      }
    ]
  },
  {
    state: 'Abuja (FCT)',
    lgas: [
      { name: 'Abaji', wards: ['Abaji Central','Agyana','Gudun Karya','Nuku','Pandagi','Rimba','Yaba'] },
      { name: 'Bwari', wards: ['Bwari','Idu','Kawu','Kubwa','Shere','Usuma','Zhiko'] },
      { name: 'Gwagwalada', wards: ['Dobi','Gwagwalada','Gwako','Ibwa','Ikwa','Pai','Tungan Maje'] },
      { name: 'Kuje', wards: ['Chibiri','Gaube','Kuje','Kujekwa','Kwaku','Rubochi','Yenche'] },
      { name: 'Kwali', wards: ['Dafa','Drain','Gwargwada','Kilankwa','Kwaita','Kwali','Yangoji'] },
      { name: 'Municipal Area Council', wards: ['Apo','Asokoro','Cadastral Zone','Central Area','Durumi','Garki I','Garki II','Gudu','Guzape','Kabusa','Mabushi','Maitama I','Maitama II','Nyanya','Wuse I','Wuse II','Wuye'] }
    ]
  },
  {
    state: 'Rivers',
    lgas: [
      { name: 'Port Harcourt', wards: ['Diobu','GRA','Mile 1','Mile 3','Nkpolu-Oroworukwo','Old GRA','Peter Odili Road','Rumuola','Rumuomasi','Trans Amadi','Waterlines','Ward 12'] },
      { name: 'Obio-Akpor', wards: ['Choba','Eligbam','Mgbuoba','Mgbuoshimini','Ogbogoro','Okporo','Oro-Item','Rumuepirikom','Rumuibekwe','Rumuola'] },
      { name: 'Ikwerre', wards: ['Aluu','Ipo','Isiokpo','Igwuruta','Omagwa','Omoku','Rumuji','Rumunkrushi','Ward 9','Ward 10'] },
      { name: 'Etche', wards: ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10'] },
    ]
  },
  {
    state: 'Kano',
    lgas: [
      { name: 'Kano Municipal', wards: ['Dala','Dorayi','Fagge','Giginyu','Gobirawa','Gwagwarwa','Kabuga','Kofar Wambai','Kofar Waika','Kurna','Naibawa','Panshekara','Sheka','Tudun Maliki','Tudun Wada'] },
      { name: 'Nassarawa', wards: ['Goron Dutse','Kurna','Kofar Ruwa','Limawa','Nasarawa Dankadai','Nasarawa Sani','Sharada'] },
      { name: 'Fagge', wards: ['Fagge A','Fagge B','Fagge C','Fagge D','Fagge E','Fagge F','Fagge G'] },
      { name: 'Gwale', wards: ['Bachirawa','Dakata','Diso','Gama','Gwale','Kabuga','Rigachikun','Saulawa'] },
    ]
  },
  {
    state: 'Ogun',
    lgas: [
      { name: 'Abeokuta South', wards: ['Adatan','Ago-Egun','Ake','Asero','Ibara','Idi-Aba','Ijaye','Isale-Igbehin','Kemta','Lafenwa','Omida','Panseke','Ward 13'] },
      { name: 'Abeokuta North', wards: ['Totoro','Ilugun','Obantoko','Oke-Ona','Opeji','Ward 6','Ward 7'] },
      { name: 'Sagamu', wards: ['Agbele','Isiwo','Makun','Ogijo','Sagamu I','Sagamu II','Sagamu III'] },
    ]
  },
  {
    state: 'Oyo',
    lgas: [
      { name: 'Ibadan North', wards: ['Agodi-Gate','Bashorun','Beere','Challenge','Ekotedo','Eleta','Gbongan','Inalende','Oja-Oba','Popoyemoja'] },
      { name: 'Ibadan South-West', wards: ['Adamasingba','Iyaganku','Jericho','Oluyole Estate','Oni-Are','Ring Road','Ward 7','Ward 8'] },
      { name: 'Ibadan North-East', wards: ['Iwo Road','Molete','Orita-Mefa','Agodi-Ibadan','Ward 5','Ward 6'] },
    ]
  }
]

// ── Helper functions ──────────────────────────────────────────

export function getStates(): string[] {
  return NIGERIA_GEO.map(g => g.state).sort()
}

export function getLGAs(state: string): string[] {
  const entry = NIGERIA_GEO.find(g => g.state === state)
  return entry ? entry.lgas.map(l => l.name).sort() : []
}

export function getWards(state: string, lga: string): string[] {
  const entry = NIGERIA_GEO.find(g => g.state === state)
  if (!entry) return []
  const lgaEntry = entry.lgas.find(l => l.name === lga)
  return lgaEntry ? lgaEntry.wards.sort() : []
}

// Normalise Nigerian phone number to +234XXXXXXXXXX
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('234') && digits.length === 13) return '+' + digits
  if (digits.startsWith('0') && digits.length === 11) return '+234' + digits.slice(1)
  if (digits.length === 10) return '+234' + digits
  return null
}

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'yoruba', label: 'Yoruba' },
  { value: 'hausa', label: 'Hausa' },
  { value: 'igbo', label: 'Igbo' },
  { value: 'pidgin', label: 'Pidgin' },
]

export const CHANNELS: { value: string; label: string; icon: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'sms', label: 'SMS', icon: '📱' },
  { value: 'voice', label: 'Voice / Robocall', icon: '📞' },
]

export const TOPICS = [
  'infrastructure', 'security', 'economy', 'education',
  'healthcare', 'water', 'electricity', 'jobs', 'general'
]
