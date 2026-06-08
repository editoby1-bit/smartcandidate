// lib/utils/geography.ts — all 36 states + FCT
export interface GeoEntry { state: string; lgas: { name: string; wards: string[] }[] }

const W = (n: number) => Array.from({length: n}, (_, i) => `Ward ${i+1}`)

export const NIGERIA_GEO: GeoEntry[] = [
  { state: 'Abia', lgas: ['Aba North','Aba South','Arochukwu','Bende','Ikwuano','Isiala Ngwa North','Isiala Ngwa South','Isuikwuato','Obi Ngwa','Ohafia','Osisioma','Ugwunagbo','Ukwa East','Ukwa West','Umuahia North','Umuahia South','Umu Nneochi'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Adamawa', lgas: ['Demsa','Fufore','Ganye','Girei','Gombi','Guyuk','Hong','Jada','Lamurde','Madagali','Maiha','Mayo Belwa','Michika','Mubi North','Mubi South','Numan','Shelleng','Song','Toungo','Yola North','Yola South'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Akwa Ibom', lgas: ['Abak','Eastern Obolo','Eket','Esit Eket','Essien Udim','Etim Ekpo','Etinan','Ibeno','Ibesikpo Asutan','Ibiono-Ibom','Ika','Ikono','Ikot Abasi','Ikot Ekpene','Ini','Itu','Mbo','Mkpat-Enin','Nsit-Atai','Nsit-Ibom','Nsit-Ubium','Obot Akara','Okobo','Onna','Oron','Oruk Anam','Udung-Uko','Ukanafun','Uruan','Urue-Offong/Oruko','Uyo'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Anambra', lgas: ['Aguata','Anambra East','Anambra West','Anaocha','Awka North','Awka South','Ayamelum','Dunukofia','Ekwusigo','Idemili North','Idemili South','Ihiala','Njikoka','Nnewi North','Nnewi South','Ogbaru','Onitsha North','Onitsha South','Orumba North','Orumba South','Oyi'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Bauchi', lgas: ['Alkaleri','Bauchi','Bogoro','Damban','Darazo','Dass','Gamawa','Ganjuwa','Giade','Itas/Gadau',"Jama'are",'Katagum','Kirfi','Misau','Ningi','Shira','Tafawa Balewa','Toro','Warji','Zaki'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Bayelsa', lgas: ['Brass','Ekeremor','Kolokuma/Opokuma','Nembe','Ogbia','Sagbama','Southern Ijaw','Yenagoa'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Benue', lgas: ['Ado','Agatu','Apa','Buruku','Gboko','Guma','Gwer East','Gwer West','Katsina-Ala','Konshisha','Kwande','Logo','Makurdi','Obi','Ogbadibo','Ohimini','Oju','Okpokwu','Otukpo','Tarka','Ukum','Ushongo','Vandeikya'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Borno', lgas: ['Abadam','Askira/Uba','Bama','Bayo','Biu','Chibok','Damboa','Dikwa','Gubio','Guzamala','Gwoza','Hawul','Jere','Kaga','Kala/Balge','Konduga','Kukawa','Kwaya Kusar','Mafa','Magumeri','Maiduguri','Marte','Mobbar','Monguno','Ngala','Nganzai','Shani'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Cross River', lgas: ['Abi','Akamkpa','Akpabuyo','Bakassi','Bekwarra','Biase','Boki','Calabar Municipal','Calabar South','Etung','Ikom','Obanliku','Obubra','Obudu','Odukpani','Ogoja','Yakuur','Yala'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Delta', lgas: ['Aniocha North','Aniocha South','Bomadi','Burutu','Ethiope East','Ethiope West','Ika North East','Ika South','Isoko North','Isoko South','Ndokwa East','Ndokwa West','Okpe','Oshimili North','Oshimili South','Patani','Sapele','Udu','Ughelli North','Ughelli South','Ukwuani','Uvwie','Warri North','Warri South','Warri South West'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Ebonyi', lgas: ['Abakaliki','Afikpo North','Afikpo South','Ebonyi','Ezza North','Ezza South','Ikwo','Ishielu','Ivo','Izzi','Ohaozara','Ohaukwu','Onicha'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Edo', lgas: ['Akoko-Edo','Egor','Esan Central','Esan North East','Esan South East','Esan West','Etsako Central','Etsako East','Etsako West','Igueben','Ikpoba-Okha','Orhionmwon','Oredo','Ovia North East','Ovia South West','Owan East','Owan West','Uhunmwonde'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Ekiti', lgas: ['Ado Ekiti','Efon','Ekiti East','Ekiti South West','Ekiti West','Emure','Gbonyin','Ido/Osi','Ijero','Ikere','Ikole','Ilejemeje','Irepodun/Ifelodun','Ise/Orun','Moba','Oye'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Enugu', lgas: ['Aninri','Awgu','Enugu East','Enugu North','Enugu South','Ezeagu','Igbo Etiti','Igbo Eze North','Igbo Eze South','Isi Uzo','Nkanu East','Nkanu West','Nsukka','Oji River','Udenu','Udi','Uzo Uwani'].map(n=>({name:n,wards:W(10)})) },
  {
    state: 'Abuja (FCT)',
    lgas: [
      { name: 'Abaji', wards: ['Abaji Central','Agyana','Gudun Karya','Nuku','Pandagi','Rimba','Yaba'] },
      { name: 'Bwari', wards: ['Bwari','Idu','Kawu','Kubwa','Shere','Usuma','Zhiko'] },
      { name: 'Gwagwalada', wards: ['Dobi','Gwagwalada','Gwako','Ibwa','Ikwa','Pai','Tungan Maje'] },
      { name: 'Kuje', wards: ['Chibiri','Gaube','Kuje','Kujekwa','Kwaku','Rubochi','Yenche'] },
      { name: 'Kwali', wards: ['Dafa','Drain','Gwargwada','Kilankwa','Kwaita','Kwali','Yangoji'] },
      { name: 'Municipal Area Council', wards: ['Apo','Asokoro','Central Area','Durumi','Garki I','Garki II','Gudu','Guzape','Kabusa','Mabushi','Maitama I','Maitama II','Nyanya','Wuse I','Wuse II','Wuye'] },
    ]
  },
  { state: 'Gombe', lgas: ['Akko','Balanga','Billiri','Dukku','Funakaye','Gombe','Kaltungo','Kwami','Nafada','Shongom','Yamaltu/Deba'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Imo', lgas: ['Aboh Mbaise','Ahiazu Mbaise','Ehime Mbano','Ezinihitte','Ideato North','Ideato South','Ihitte/Uboma','Ikeduru','Isiala Mbano','Isu','Mbaitoli','Ngor Okpala','Njaba','Nkwerre','Nwangele','Obowo','Oguta','Ohaji/Egbema','Okigwe','Onuimo','Orlu','Orsu','Oru East','Oru West','Owerri Municipal','Owerri North','Owerri West'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Jigawa', lgas: ['Auyo','Babura','Biriniwa','Birnin Kudu','Buji','Dutse','Gagarawa','Garki','Gumel','Guri','Gwaram','Gwiwa','Hadejia','Jahun','Kafin Hausa','Kaugama','Kazaure','Kiri Kasama','Kiyawa','Maigatari','Malam Madori','Miga','Ringim','Roni','Sule Tankarkar','Taura','Yankwashi'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Kaduna', lgas: ['Birnin Gwari','Chikun','Giwa','Igabi','Ikara','Jaba',"Jema'a",'Kachia','Kaduna North','Kaduna South','Kagarko','Kajuru','Kaura','Kauru','Kubau','Kudan','Lere','Makarfi','Sabon Gari','Sanga','Soba','Zangon Kataf','Zaria'].map(n=>({name:n,wards:W(10)})) },
  {
    state: 'Kano',
    lgas: [
      { name: 'Kano Municipal', wards: ['Dala','Dorayi','Fagge','Giginyu','Gobirawa','Gwagwarwa','Kabuga','Kofar Wambai','Kofar Waika','Kurna','Naibawa','Panshekara','Sheka','Tudun Maliki','Tudun Wada'] },
      { name: 'Fagge', wards: ['Fagge A','Fagge B','Fagge C','Fagge D','Fagge E','Fagge F','Fagge G'] },
      { name: 'Gwale', wards: ['Bachirawa','Dakata','Diso','Gama','Gwale','Kabuga','Rigachikun','Saulawa'] },
      { name: 'Nassarawa', wards: ['Goron Dutse','Kurna','Kofar Ruwa','Limawa','Nasarawa Dankadai','Nasarawa Sani','Sharada'] },
      ...['Ajingi','Albasu','Bagwai','Bebeji','Bichi','Bunkure','Dala','Dambatta','Dawakin Kudu','Dawakin Tofa','Doguwa','Gabasawa','Garko','Garun Mallam','Gaya','Gezawa','Gwarzo','Kabo','Karaye','Kibiya','Kiru','Kumbotso','Kunchi','Kura','Madobi','Makoda','Minjibir','Rano','Rimin Gado','Rogo','Shanono','Sumaila','Takai','Tarauni','Tofa','Tsanyawa','Tudun Wada','Ungogo','Warawa','Wudil'].map(n=>({name:n,wards:W(10)}))
    ]
  },
  { state: 'Katsina', lgas: ['Bakori','Batagarawa','Batsari','Baure','Bindawa','Charanchi','Dandume','Danja','Dan Musa','Daura','Dutsi','Dutsin-Ma','Faskari','Funtua','Ingawa','Jibia','Kafur','Kaita','Kankara','Kankia','Katsina','Kurfi','Kusada',"Mai'Adua",'Malumfashi','Mani','Mashi','Matazu','Musawa','Rimi','Sabuwa','Safana','Sandamu','Zango'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Kebbi', lgas: ['Aleiro','Arewa Dandi','Argungu','Augie','Bagudo','Birnin Kebbi','Bunza','Dandi','Fakai','Gwandu','Jega','Kalgo','Koko/Besse','Maiyama','Ngaski','Sakaba','Shanga','Suru','Wasagu/Danko','Yauri','Zuru'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Kogi', lgas: ['Adavi','Ajaokuta','Ankpa','Bassa','Dekina','Ibaji','Idah','Igalamela-Odolu','Ijumu','Kabba/Bunu','Kogi','Lokoja','Mopa-Muro','Ofu','Ogori/Magongo','Okehi','Okene','Olamaboro','Omala','Yagba East','Yagba West'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Kwara', lgas: ['Asa','Baruten','Edu','Ekiti','Ifelodun','Ilorin East','Ilorin South','Ilorin West','Irepodun','Isin','Kaiama','Moro','Offa','Oke Ero','Oyun','Pategi'].map(n=>({name:n,wards:W(10)})) },
  {
    state: 'Lagos',
    lgas: [
      { name: 'Agege', wards: ['Agege Central','Agege Station','Isale Oja','Keke','Oko Oba I','Oko Oba II','Orile Agege','Tabon Tabon','Tolu','Ward 10'] },
      { name: 'Ajeromi-Ifelodun', wards: ['Ajegunle I','Ajegunle II','Ajegunle III','Ajegunle IV','Ajegunle V','Awodi Ora','Layeni','Olodi','Tolu','Worukoh'] },
      { name: 'Alimosho', wards: ['Agbado/Oke-Odo','Ayobo/Ipaja I','Ayobo/Ipaja II','Egbeda I','Egbeda II','Igando/Ikotun I','Igando/Ikotun II','Mosan/Okunola','Obafemi/Owode','Shasha'] },
      { name: 'Amuwo-Odofin', wards: W(10) },
      { name: 'Apapa', wards: ['Apapa I','Apapa II','Apapa III','Apapa IV','Apapa V','Olodi Apapa I','Olodi Apapa II','Apapa VIII'] },
      { name: 'Badagry', wards: ['Ajido','Awhanjigo','Badagry I','Badagry II','Ganyingbo','Ibereko','Ihuwa','Iworo','Topo','Whappa'] },
      { name: 'Epe', wards: W(10) },
      { name: 'Eti-Osa', wards: ['Elegushi/Ikate','Igbo Efon','Lekki I','Lekki II','Maroko','Oniyanrin','Victoria Island I','Victoria Island II','Ikoyi I','Ikoyi II'] },
      { name: 'Ibeju-Lekki', wards: W(10) },
      { name: 'Ifako-Ijaiye', wards: W(10) },
      { name: 'Ikeja', wards: ['Adeniyi Jones','Allen','Anifowoshe','Ikeja I','Ikeja II','Maryland','Ojodu I','Ojodu II','Onigbongbo I','Onigbongbo II'] },
      { name: 'Ikorodu', wards: ['Agura','Igbogbo I','Igbogbo II','Ijede','Ikorodu I','Ikorodu II','Ikorodu III','Imota','Ipakodo','Isiu','Itamaga','Odogunyan'] },
      { name: 'Kosofe', wards: ['Agboyi I','Agboyi II','Ikosi/Ejirin','Ikosi/Isheri','Ketu I','Ketu II','Mile 12','Oworonshoki I','Oworonshoki II','Ward 10'] },
      { name: 'Lagos Island', wards: ['Campos','Epetedo','Isale-Eko I','Isale-Eko II','Lafiaji','Olowogbowo I','Olowogbowo II','Oke-Suna','Popo/Tokunbo','Ward 10'] },
      { name: 'Lagos Mainland', wards: ['Ebute-Metta East','Ebute-Metta West','Epetedo','Glover','Iganmu','Olaleye','Yaba I','Yaba II','Yaba III','Ward 10'] },
      { name: 'Mushin', wards: ['Idiaraba/Ojuwoye','Ilasamaja I','Ilasamaja II','Mushin I','Mushin II','Mushin III','Mushin IV','Mushin V','Mushin VI','Ward 10'] },
      { name: 'Ojo', wards: ['Ajeromi','Alaba Rago','Iba','Ilemba-Hausa','Ojo I','Ojo II','Olojo','Oriade','Oto-Awori','Trade Fair'] },
      { name: 'Oshodi-Isolo', wards: ['Ajao Estate','Bolade/Oshodi','Ilasamaja','Isolo I','Isolo II','Mafoluku','Mile 2','Okota I','Okota II','Shogunle'] },
      { name: 'Shomolu', wards: ['Bariga I','Bariga II','Bariga III','Shomolu I','Shomolu II','Shomolu III','Shomolu IV','Ward 8','Ward 9','Ward 10'] },
      { name: 'Surulere', wards: ['Itire/Ikate','Surulere I','Surulere II','Surulere III','Surulere IV','Surulere V','Surulere VI','Surulere VII','Surulere VIII','Ward 10'] },
    ]
  },
  { state: 'Nasarawa', lgas: ['Akwanga','Awe','Doma','Karu','Keana','Keffi','Kokona','Lafia','Nasarawa','Nasarawa-Eggon','Obi','Toto','Wamba'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Niger', lgas: ['Agaie','Agwara','Bida','Borgu','Bosso','Chanchaga','Edati','Gbako','Gurara','Katcha','Kontagora','Lapai','Lavun','Magama','Mariga','Mashegu','Mokwa','Munya','Paikoro','Rafi','Rijau','Shiroro','Suleja','Tafa','Wushishi'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Ogun', lgas: ['Abeokuta North','Abeokuta South','Ado-Odo/Ota','Egbado North','Egbado South','Ewekoro','Ifo','Ijebu East','Ijebu North','Ijebu North East','Ijebu Ode','Ikenne','Imeko-Afon','Ipokia','Obafemi-Owode','Odeda','Odogbolu','Ogun Waterside','Remo North','Sagamu'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Ondo', lgas: ['Akoko North East','Akoko North West','Akoko South East','Akoko South West','Akure North','Akure South','Ese Odo','Idanre','Ifedore','Ilaje','Ile Oluji/Okeigbo','Irele','Odigbo','Okitipupa','Ondo East','Ondo West','Ose','Owo'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Osun', lgas: ['Aiyedaade','Aiyedire','Atakumosa East','Atakumosa West','Boluwaduro','Boripe','Ede North','Ede South','Egbedore','Ejigbo','Ife Central','Ife East','Ife North','Ife South','Ifedayo','Ifelodun','Ila','Ilesa East','Ilesa West','Irepodun','Irewole','Isokan','Iwo','Obokun','Odo-Otin','Ola-Oluwa','Olorunda','Oriade','Orolu','Osogbo'].map(n=>({name:n,wards:W(10)})) },
  {
    state: 'Oyo',
    lgas: [
      { name: 'Ibadan North', wards: ['Agodi-Gate','Bashorun','Beere','Challenge','Ekotedo','Eleta','Gbongan','Inalende','Oja-Oba','Popoyemoja'] },
      { name: 'Ibadan North East', wards: W(10) },
      { name: 'Ibadan North West', wards: W(10) },
      { name: 'Ibadan South East', wards: W(10) },
      { name: 'Ibadan South West', wards: ['Adamasingba','Iyaganku','Jericho','Oluyole Estate','Oni-Are','Ring Road','Ward 7','Ward 8'] },
      ...['Afijio','Akinyele','Atiba','Atisbo','Egbeda','Ibarapa Central','Ibarapa East','Ibarapa North','Ido','Irepo','Iseyin','Itesiwaju','Iwajowa','Kajola','Lagelu','Ogbomosho North','Ogbomosho South','Ogo Oluwa','Olorunsogo','Oluyole','Ona Ara','Orelope','Ori Ire','Oyo East','Oyo West','Saki East','Saki West','Surulere'].map(n=>({name:n,wards:W(10)}))
    ]
  },
  { state: 'Plateau', lgas: ['Barkin Ladi','Bassa','Bokkos','Jos East','Jos North','Jos South','Kanam','Kanke','Langtang North','Langtang South','Mangu','Mikang','Pankshin',"Qua'an Pan",'Riyom','Shendam','Wase'].map(n=>({name:n,wards:W(10)})) },
  {
    state: 'Rivers',
    lgas: [
      { name: 'Port Harcourt', wards: ['Diobu I','Diobu II','GRA I','GRA II','Mile 1','Mile 3','Nkpolu-Oroworukwo','Rumuomasi','Trans Amadi','Waterlines'] },
      { name: 'Obio-Akpor', wards: ['Choba','Eligbam','Mgbuoba','Mgbuoshimini','Ogbogoro','Okporo','Rumuepirikom','Rumuibekwe','Rumuola','Oro-Item'] },
      { name: 'Ikwerre', wards: ['Aluu','Ipo','Isiokpo','Igwuruta','Omagwa','Rumuji','Rumunkrushi','Ward 8','Ward 9','Ward 10'] },
      ...['Abua/Odual','Ahoada East','Ahoada West','Akuku-Toru','Andoni','Asari-Toru','Bonny','Degema','Eleme','Emohua','Etche','Gokana','Khana','Ogba/Egbema/Ndoni','Ogu/Bolo','Okrika','Omuma','Opobo/Nkoro','Oyigbo','Tai'].map(n=>({name:n,wards:W(10)}))
    ]
  },
  { state: 'Sokoto', lgas: ['Binji','Bodinga','Dange Shuni','Gada','Goronyo','Gudu','Gwadabawa','Illela','Isa','Kebbe','Kware','Rabah','Sabon Birni','Shagari','Silame','Sokoto North','Sokoto South','Tambuwal','Tangaza','Tureta','Wamako','Wurno','Yabo'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Taraba', lgas: ['Ardo-Kola','Bali','Donga','Gashaka','Gassol','Ibi','Jalingo','Karim Lamido','Kumi','Lau','Sardauna','Takum','Ussa','Wukari','Yorro','Zing'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Yobe', lgas: ['Bade','Bursari','Damaturu','Fika','Fune','Geidam','Gujba','Gulani','Jakusko','Karasuwa','Machina','Nangere','Nguru','Potiskum','Tarmuwa','Yunusari','Yusufari'].map(n=>({name:n,wards:W(10)})) },
  { state: 'Zamfara', lgas: ['Anka','Bakura','Birnin Magaji/Kiyaw','Bukkuyum','Bungudu','Gummi','Gusau','Kaura Namoda','Maradun','Maru','Shinkafi','Talata Mafara','Tsafe','Zurmi'].map(n=>({name:n,wards:W(10)})) },
]

export function getStates(): string[] { return NIGERIA_GEO.map(g => g.state).sort() }
export function getLGAs(state: string): string[] {
  return (NIGERIA_GEO.find(g => g.state === state)?.lgas.map(l => l.name) ?? []).sort()
}
export function getWards(state: string, lga: string): string[] {
  const entry = NIGERIA_GEO.find(g => g.state === state)
  return (entry?.lgas.find(l => l.name === lga)?.wards ?? []).sort()
}
export function normalisePhone(raw: string): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('234') && d.length === 13) return '+' + d
  if (d.startsWith('0')   && d.length === 11) return '+234' + d.slice(1)
  if (d.length === 10) return '+234' + d
  return null
}
export const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'yoruba',  label: 'Yoruba'  },
  { value: 'hausa',   label: 'Hausa'   },
  { value: 'igbo',    label: 'Igbo'    },
  { value: 'pidgin',  label: 'Pidgin'  },
]
export const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp',         icon: '💬' },
  { value: 'sms',      label: 'SMS',              icon: '📱' },
  { value: 'voice',    label: 'Voice / Robocall', icon: '📞' },
]
export const TOPICS = ['infrastructure','security','economy','education','healthcare','water','electricity','jobs','general']
