// Four- to six-letter words from the Google 10k. Short-name edits refuse any
// word here. English words the list missed are `extraCommonWords` in
// detection-tuning.ts.

const COMMON_WORD_TEXT = `
aaron able about above abroad absent abuse accent accept access acer acid acids acne acre acres
across acting action active actor actors acts actual acute adam adams added adding adds adidas
adipex adjust admin admit adobe adopt adrian adsl adult adults advert advice advise adware aerial
affair affect afford afraid africa after again aged agency agenda agent agents ages aging agree
agreed agrees ahead aids aimed aims alan alarm alaska albany albert album albums alert alerts alex
alfred alias alice alien align alike alive allah allan allen allied allow allows alloy almost alone
along alot alpha alpine also alter alto alumni always amanda amazon amber ambien amend amino among
amount analog anchor andale andrea andrew andy angel angela angels anger angle angola angry animal
anime anna anne annex annie annual answer anti anyone anyway apache apart apnic apollo appeal appear
apple apply approx apps april aqua arab arabia arabic arbor arcade arch arctic area areas arena
argue argued arise armed armor arms army arnold around array arrest arrive arrow arthur artist arts
aruba ascii ashley asia asian aside asin asked asking asks aspect assess asset assets assign assist
assume assure asthma asus asylum athens atlas atom atomic attach attack attend auburn audi audio
audit august aurora austin author auto autos autumn avatar avenue avoid avon award awards aware away
awful axis babe babes babies baby back backed backup bacon badge badly bags bailey baker baking bald
bali ball ballet ballot banana band bands bang bank banks banned banner barbie bare barely barn
barnes barrel barry bars base based bases basic basics basin basis basket bass batch bath baths
batman battle beach beads beam bean beans bear bears beast beat beats beauty beaver became become
beds beef been beer before began begin begins begun behalf behind being beings belief belize belkin
bell belle belly belong below belt belts bench bend bent benz berlin berry beside best beta beth
better betty beyond bhutan bias bible bidder bids bigger bike bikes bikini bill bills billy binary
bind bingo biol bios bird birds birth bishop bite bits black blacks blade blades blah blair blake
blame blank blast blend bless blind blink block blocks blog blogs blond blonde blood bloom blow blue
blues blvd board boards boat boats bobby bodies body bold bolt bomb bond bonds bone bones bonus book
books bool boom boost boot booth boots booty border bored boring born bosnia boss boston both bother
bottle bottom bought bound bowl boxed boxes boxing boys brad brain brake brakes branch brand brands
bras brass brave brazil breach bread break breaks breast breath breed breeds brian brick bridal
bride bridge brief briefs bright bring brings broad broke broken broker bronze brook brooks brown
browse bruce brunei brush brutal bryan bryant bubble buck bucks buddy budget buffer bufing bugs
build builds built bulk bull bullet bumper bunch bundle bunny burden bureau buried burke burn burner
burns burst burton buses bush busy butler butter button butts buyer buyers buying buys buzz byte
bytes cabin cable cables cache cached cafe cage cake cakes call called calls calm calvin came camel
camera camp camps campus cams canada canal cancel cancer candle candy cannon canon cant canvas
canyon cape caps carb carbon card cards care career carey cargo caring carl carlo carlos carmen
carol carpet carry cars cart carter casa case cases casey cash casino casio cast castle casual catch
cats cattle caught cause caused causes cave cayman cdna cedar celebs cell cells celtic cement census
cent center centre cents chad chain chains chair chairs chan chance change chaos chapel char charge
charm charms chart charts chase chat cheap cheat cheats check checks cheers cheese chef chem chen
cheque cherry chess chest chevy chick chicks chief child chile china chip chips choice choir choose
chorus chose chosen chris christ chrome chubby chuck church cialis ciao cindy cinema circle circus
cisco cite cited cities city civic civil claim claims claire clan clara clark clarke class clause
clay clean clear clerk click clicks client cliff climb clinic clip clips clock clocks clone close
closed closer closes cloth cloud clouds cloudy club clubs cnet coach coal coast coat coated code
codes coding coffee cohen coin coins cold cole colin collar colon colony color colors column combat
combo come comedy comes comic comics coming comm commit common comp compaq comply condo condos conf
config congo cons const cook cooked cookie cool cooler cooper cope copied copies copper copy coral
cord core cork corn corner corp corps corpus cost costa costs cotton could count counts county
couple coupon course court courts cove cover covers cowboy crack cradle craft crafts craig craps
crash crazy cream create credit creek crest crew crime crimes crisis crop crops cross crowd crown
crude cruise cruz ctrl cuba cube cubic cult cups cure cursor curtis curve curves custom cute cuts
cyber cycle cycles cyprus czech daddy daily dairy daisy dakota dale dallas damage dame dana dance
danger daniel danish danny dans dare dark darwin dash data date dated dates dating dave david davis
dawn days dayton dead deadly deaf deal dealer deals dealt dean dear death deaths debate debian debt
debug debut decade decent decide deck decor deemed deep deeper deeply deer defeat defend define
degree delay delays delete delhi dell delta deluxe demand demo denial denied dennis dense dental
denver deny depend depot dept depth deputy derby derek desert design desire desk detail detect devel
device devil devon dial dialog diana diane diary dice dicke died diego dies diesel diet diff differ
diffs digest digit dining dinner direct dirt dirty disc disco discs dish dishes disk disks disney
dist dive divide divine diving divx dock docs doctor dodge does dogs doing doll dollar dolls domain
dome donald donate done donna donor donors dont doom door doors dosage dose double doubt doug dover
down dozen dozens draft drag dragon drain drama draw drawn draws dream dreams dress drew dried drill
drink drinks drive driven driver drives drop drops drove drug drugs drum drums drunk dryer dual
dubai dublin duck dude duke dumb dump duncan durham during dust dutch duties duty dvds dying dylan
each eagle eagles earl early earn earned ears earth ease easier easily east easter easy eating ebay
ebony ebook ebooks echo eddie eden edgar edge edges edit edited editor edward effect effort eggs
egypt eight either elder elect eleven elite ellen ellis else elvis emacs email emails emily eminem
emma empire employ empty enable ended endif ending ends enemy energy engage engine enjoy enough
ensure enter enters entire entity entry enzyme epic epson equal equity eric erik error errors escape
espn essay essays essex estate ethics ethnic eugene euro europe euros eval evans even event events
ever every evil exact exam exams exceed excel except excess excuse exec exempt exist exists exit
exotic expand expect expert expo export extend extent extra extras eyed eyes fabric face faced faces
facial facing fact factor facts fail failed fails fair fairly fairy faith fake fall fallen falls
false fame family famous fancy fans faqs fare fares farm farmer farms fast faster fatal fate father
fatty fault favor favors fear fears feat feed feeds feel feels fees feet fell fellow felt female
fence feof ferry fetish fever fewer fiber fibre field fields fifth fifty fight figure fiji file
filed files filing fill filled film filme films filter final finals find finder finds fine finest
finger finish finite fire fired fires firm firms first fiscal fish fisher fist fits fitted five
fixed fixes flag flags flame flash flat flavor fleece fleet flesh flex flickr flight flip float
flood floor floors floppy floral flour flow flower flows floyd fluid flush flux flyer flying foam
focal focus fold folder folk folks follow font fonts food foods fool foot forbes force forced forces
ford forest forge forget forgot fork form formal format formed former forms fort forth forty forum
forums fossil foster foto fotos fought foul found four fourth frame framed frames france frank
fraser fraud fred free freely freeze french fresh friday fridge friend frog from front frost frozen
fruit fruits fuel fuji full fully fund funded funds funk funky funny fusion future fuzzy gage gain
gained gains galaxy gale game games gaming gamma gang gaps garage garcia garden garlic garmin gary
gate gates gather gauge gave gays gear geek gender gene genes geneva genius genome genre genres
gentle gently george gerald german gets ghana ghost giant giants gibson gift gifts girl girls give
given gives giving glad glance glass glen glenn global globe glory gloves glow gmbh gnome goal goals
goat gods goes going gold golden golf gone gonna good goods google gordon gore gospel gossip gothic
goto gotta gotten grab grace grad grade grades graham grain grams grand grande granny grant grants
graph graphs gras grass gratis grave gray great greece greek green greene greg grew grey grid grill
grip groove gross ground group groups grove grow grown grows growth guam guard guards guess guest
guests guide guided guides guild guilty guinea guitar gulf guns guru guyana guys gzip habits hack
hacker hair hairy haiti half hall halo hammer hand handed handle hands handy hang hans hansen happen
happy harbor hard harder hardly harley harm harold harper harris harry hart harvey hash hate hats
have haven having hawaii hawk hayes hazard hdtv head headed header heads health hear heard heart
hearts heat heated heater heath heaven heavy hebrew heel height held helen helena hello helmet help
helped helps hence henry herald herb herbal herbs here hereby herein hero heroes hidden hide high
higher highly highs hiking hill hills hilton hindu hint hints hire hired hiring hist hits hobby
hockey hold holdem holder holds hole holes hollow holly holmes holy home homes honda honest honey
hong honor honors hood hook hope hoped hopes hoping horn horror horse horses hose host hosted hostel
hosts hotel hotels hour hourly hours house houses howard howto href html http hudson huge hugh
hughes hugo hull human humans humor hung hunger hungry hunt hunter hurt hybrid icon icons idaho idea
ideal ideas idle idol ieee ignore image images immune impact import impose inbox inch inches incl
income indeed index india indian indie indoor infant info inform injury inkjet inline inner inns
input inputs insert inside intake intel intend intent inter intl into intro invest invite iowa ipaq
ipod iran iraq iraqi irish iron isaac isbn islam island isle israel issn issue issued issues italia
italic italy item items itself itunes ivory jack jacket jackie jacob jade jaguar jail jake james
jamie jane janet japan jason java jazz jean jeans jeep jeff jenny jeremy jerry jersey jesse jesus
jets jewel jewish jews jill jimmy joan jobs joel john johnny johns join joined joins joint joke
jokes jones jordan jose joseph josh joshua joyce jpeg juan judge judges judy juice julia julian
julie july jump june jungle junior junk jury just justin kansas karen karl karma kate kathy katie
keen keep keeps keith kelkoo kelly kenny keno kent kenya kept kernel kerry kevin keys kick kidney
kids kijiji kill killed killer kills kinase kind kinda kinds king kings kirk kiss kits kitty klein
knee knew knife knight knit knives knock know known knows kodak kong korea korean kruger kurt kuwait
kyle label labels labor labs lace lack ladder laden ladies lady laid lake lakes lamb lambda lamp
lamps lance land lands lane lanes lang lanka laos laptop large larger larry laser last late lately
later latest latex latin latina latino latter latvia laugh launch laura lauren lawn laws lawyer
layer layers layout lazy lead leader leads leaf league lean learn lease least leave leaves leeds
left legacy legal legend legs lemon lender length lens lenses leon leone leslie less lesser lesson
lets letter level levels levy lewis lexus liable libs lies life lift light lights like liked likely
likes lime limit limits linda line linear lined lines link linked links linux lion lions lips liquid
lisa list listed listen lists lite little live lived liver lives living lloyd load loaded loads loan
loans lobby local locale locate lock locked locks lodge logan logged logic login logo logos logs
london lone lonely long longer look looked looks lookup loop loops loose lopez lord lose losing loss
losses lost lots lotus loud louis louise lounge love loved lovely lover lovers loves loving lower
lowest lows lucas lucia luck lucky lucy luis luke lunch lung luther luxury lycos lying lynn lyric
lyrics macro made madrid magic magnet maiden mail mailed mails mailto main maine mainly major make
maker makers makes makeup making malawi male males mali mall malta mambo manage manga manner manor
manual many maple maps marble marc march marco marcus mardi margin maria mariah marie marina marine
mario marion mark marked marker market marks mars marsh mart martha martin marvel mary mask mason
mass master match mate math mating matrix mats matt matter mature maui maybe mayor mazda meal meals
mean means meant meat medal media median medium meet meets meetup mega member memo memory mens ment
mental mentor menu menus mercy mere merely merge merger merit merry mesa mesh mess meta metal metals
meter meters method metres metric metro mexico meyer miami mice michel micro middle midi might
mighty mike milan mild mile miles milk mill miller mills milton mime mind minds mine mines mini
mining minor mins mint minus minute mirror misc miss missed mixed mixer mixing mobile mode model
models modem modems modern modes modify mods module mold moment moms monaco monday money monica
monkey mono monroe monte month months mood moon moore moral more morgan morris moscow moses moss
most mostly motel motels mother motion motor motors mount mounts mouse mouth move moved movers moves
movie movies moving mpeg mpegs mrna msgid msgstr msie much multi mumbai munich murder murphy murray
muscle museum music muslim must mutual muze myers myrtle myself mysql myth nail nails naked name
named namely names nancy nano naples narrow nasa nascar nasdaq nasty nathan nation native nato
nature naval navy ncaa near nearby nearly neck need needed needle needs neil nelson neon nepal nerve
nest nested neural nevada never newark newbie newer newest newly newman news newton next nextel nice
nick nickel nicole niger night nights nike nikon nine nissan noble nobody node nodes noise nokia
none noon norm normal norman north norton norway nose note noted notes notice notify notion notre
nova novel novels ntsc nudist nuke null number nurse nurses nuts nutten nvidia nylon oaks oasis
object obtain occur occurs ocean oclc odds oecd offer offers office offset often ohio oils okay
older oldest olive oliver omaha oman omega once ones onion online only onto oops open opened opens
opera optics option oracle oral orange orbit order orders oregon organ origin oscar other others
ottawa ought ours outer outlet output oval oven over owen owned owner owners owns oxford oxide
oxygen ozone pace pack packed packet packs pads page pages paid pain paint pair pairs palace pale
palm palmer pamela panama panel panels panic pants paper papers papua para parade parcel parent
paris parish park parker parks part partly parts party paso pass passed passes past pasta paste
pastor patch patent path paths patio patrol paul paxil payday paying paypal pays pdas peace peak
pearl peas peeing peer peers pencil penn penny pens people pepper period perl permit perry person
perth peru pest pete peter petite pets phase phases phil philip phone phones photo photos phpbb
phrase phys piano pick picked picks pickup picnic pics piece pieces pierce pierre pike pill pillow
pills pilot pine ping pink pins pipe pipes pitch pixel pixels pizza place placed places plain plains
plan plane planes planet plans plant plants plasma plate plates play played player plays plaza
please pledge plenty plot plots plug plugin plus pmid pocket poem poems poet poetry point points
poison poker poland polar pole police policy polish poll polls polo poly pond pool pools poor pope
pork port portal porter ports pose posing post postal posted poster posts potato potter pound pounds
pour powder powell power powers prague praise pray prayer prefer prefix prep press pretty prev price
priced prices pride priest prime prince print prints prior prison prix prize prizes probe proc
profit promo prompt proof proper pros prot proud prove proved proven proxy prozac public pubmed pubs
puerto pull pulled pulse pump pumps punch punk pupils puppy pure purple purse pursue push pushed
puts puzzle python qatar quad quebec queen queens query quest queue quick quiet quilt quit quite
quiz quote quoted quotes rabbit race races rachel racial racing rack racks radar radio radios radius
rage raid rail rain raise raised raises rally ralph ranch rand random randy range ranger ranges rank
ranked ranks rapid rapids rare rarely rate rated rates rather rating ratio ratios rats rays reach
read reader reads ready real really realm realty rear reason rebate rebel recall recent recipe
record redeem reduce reed reef reel refer refers refine reform refund refuse regard reggae regime
region rehab reid reject relate relax relay relief reload rely remain remark remedy remind remix
remote remove render renew reno rent rental repair repeat reply report rescue reset resist resort
rest result resume retail retain retro return reveal review reward rhode rhythm ribbon rica rice
rich rick ricky rico ride rider riders rides ridge riding right rights ring rings ripe rise rising
risk risks river rivers road roads robbie robert robin robot robots robust rock rocket rocks rocky
roger rogers roland role roles roll rolled roller rolls roman rome ronald roof room rooms root roots
rope rosa rose roses ross roster rotary rouge rough round rounds route router routes rover rows
royal rubber ruby rugby rugs rule ruled rules ruling runner runs rural rush russia ruth rwanda ryan
sacred saddam safari safe safely safer safety sage sagem said sail saint saints sake salad salary
sale salem sales sally salmon salon salt samba same samoa sample samuel sand sandra sandy sans santa
sanyo sara sarah satin saturn sauce saudi savage save saved saver saves saving saying says sbjct
scale scales scan scared scary scene scenes scenic schema scheme school scoop scope score scored
scores scotia scott scout screen screw script scroll scsi scuba seal sealed sean search seas season
seat seats second secret sector secure seed seeds seeing seek seeker seeks seem seemed seems seen
sees sega select self sell seller sells semi senate send sender sends senior sense sensor sent sept
serbia serial series serum serve served server serves sets settle setup seven severe sewing sexual
shade shades shadow shaft shake shall shame shape shaped shapes share shared shares shark sharon
sharp shaved shaw shed sheep sheer sheet sheets shelf shell shield shift shine ship ships shirt
shirts shock shoe shoes shoot shop shops shore short shorts shot shots should show showed shower
shown shows shut sick side sides sierra sight sigma sign signal signed signs signup silent silk
silly silver simon simple simply sims since sing singer singh single sink sister site sites sixth
size sized sizes skiing skill skills skin skins skip skirt skirts skype slave sleep sleeps sleeve
slide slides slight slim slip slope slot slots slovak slow slowly small smart smell smile smith
smoke smooth smtp snake snap snow soap soccer social socket socks sodium sofa soft soil solar sold
sole solely solid solo solve solved soma some song songs sonic sons sony soon sorry sort sorted
sorts sought soul souls sound sounds soup source south soviet space spaces spain spam span spank
sparc spare spas speak speaks spears spec specs speech speed speeds spell spend spent sperm sphere
spice spider spies spin spine spirit split spoke spoken sport sports spot spots spouse spray spread
spring sprint squad square stable stack staff stage stages stake stamp stamps stan stand stands star
stars start starts stat state stated states static stats status stay stayed stays steady steal steam
steel stem step steps stereo steve steven stick sticks sticky still stock stocks stolen stone stones
stood stop stops store stored stores storm story strain strand strap stream street stress strict
strike string strip strips stroke strong struck struct stuart stuck stud studio study stuff stupid
style styles stylus subaru submit subtle such sudan sudden suffer sugar suit suite suited suites
suits summer summit sunday sunny sunset super superb supply sure surely surf surge surrey survey
susan suse sussex suzuki swap sweden sweet swift swim swing swiss switch sword sydney symbol sync
syntax syria system table tables tablet tabs tackle tagged tags tahoe tail taiwan take taken takes
taking tale talent tales talk talked talks tall tamil tampa tank tanks tape tapes target tariff task
tasks taste tattoo taught taxes taxi taylor teach team teams tear tears tech techno teddy teen teens
teeth tell tells temp temple tenant tend tender tennis tent term terms terror terry test tested
tests texas text texts thai than thank thanks that thats thee theft thehun their them theme themes
then theory there these thesis theta they thick thin thing things think thinks third thirty this
thomas thong thongs those thou though thread threat three throat throw thrown throws thru thumb
thumbs thus ticket tide tied tier ties tiger tigers tight tile tiles till timber time timely timer
times timing tiny tion tions tips tire tired tires tissue titans title titled titles titten tobago
today todd toilet token tokyo told toll tomato tommy tone toner tones tongue tons tony took tool
tools tooth topic topics tops total totals touch tough tour tours toward tower towers town towns
toxic toyota toys trace track tracks tract tracy trade trader trades trail trails train trains
trance trans trap trash trauma travel travis tray treat treaty tree trees trek trembl trend trends
treo trial trials tribal tribe tribes trick tricks tried tries trim trio trip triple trips trivia
troops trout troy truck trucks true truly trunk trust trusts truth trying tube tubes tucson tulsa
tumor tune tuner tunes tuning tunnel turbo turkey turn turned turner turns turtle twelve twenty
twice twiki twin twins twist tyler type types typing uganda ugly ultra ultram unable uncle under
undo union unions unique unit united units unity univ unix unless unlike unlock until unto unwrap
update upload upon upper upset urban urge urgent urls usage usda used useful user users uses usgs
using usps usual utah utils vacuum valid valium valley value valued values valve valves varied
varies vary vast vault vector vegas velvet vendor venice venue venues verbal verde verify vernon
verse versus vertex very vessel vice victim victor video videos vids vienna view viewed viewer views
viii viking villa villas vinyl violin viral virgin virtue virus visa vision visit visits vista
visual vital vocal vocals voice voices void voip volt volume volvo vote voted voters votes voting
voyuer vsnet wage wages wagner wagon wait waiver wake wales walk walked walker walks wall wallet
walls walnut walt walter wanna want wanted wants ward ware warm warned warner warren wars wash
washer waste watch water waters watson watt watts wave waves wayne ways weak wealth weapon wear
webcam weblog weed week weekly weeks weight weird well wells welsh wendy went were wesley west whale
what whats wheat wheel wheels when where which while whilst white whole whom whose wicked wide
widely wider width wife wifi wiki wild wiley will willow wilson wind window winds wine wines wing
wings winner wins winter wire wired wires wiring wisdom wise wish wishes witch with within wives
wizard wolf woman women womens wonder wood wooden woods wool word words work worked worker works
world worlds worm worn worry worse worst worth worthy would wound wrap wright wrist write writer
writes wrong wrote xanax xbox xerox xhtml yacht yahoo yale yamaha yang yard yards yarn yeah year
yearly years yeast yellow yemen yield yields yoga york young your yours youth yukon zambia zdnet
zero zinc zoloft zone zones zoning zoom zope zshops
`;

const COMMON_WORDS = new Set(COMMON_WORD_TEXT.split(/\s+/).filter(Boolean));

export const isCommonWord = (word: string): boolean => COMMON_WORDS.has(word);
