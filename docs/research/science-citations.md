# Science citations for the engine constants (verified 2026-09-04)

Verified against PubMed metadata and primary pages by the Phase 0 research sweep. Use these when writing the cited comments in `src/engine/constants.ts` (Phase 3). Convention: cite the journal issue year (Maeo et al. is therefore 2023). Do not change any §4.3 constant on the strength of this file — write an objection ADR and ask (CLAUDE.md).

## Summary

All eight brief citations (a-h) exist and were verified against PubMed metadata and primary pages; most support the constants as written, but four need attribution fixes. (a) Schoenfeld/Ogborn/Krieger 2017 J Sports Sci 35(11):1073-82 supports the graded volume dose-response (+0.37%/set; the <5/5-9/10+ category split was only a trend, p=0.074). (b) Schoenfeld/Ogborn/Krieger 2016 Sports Med 46(11):1689-97 supports >=2x/week, but note the same group's 2019 update (J Sports Sci 37(11):1286-95) and Pelland 2026 both find frequency has no meaningful effect once volume is equated, so treat it as a volume-distribution heuristic. (c) Baz-Valle et al. 2022 J Hum Kinet 81:199-210 only partially supports a ~20-set ceiling: no moderate-vs-high difference for quads/biceps but >20 sets was better for triceps; recommended 12-20 sets. (d) The Pelland SportRxiv preprint (doi 10.51224/SRXIV.460, posted Oct 2024) is now published: Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. Sports Med 2026;56(2):481-505 (epub 4 Dec 2025, PMID 41343037); it establishes the 0.5 'fractional' weighting of indirect sets, a square-root hypertrophy curve with no clear plateau (MED 4 fractional sets; efficiency tiers 5-10, 11-18, 19-29, 30-42, 43+ unclear), and a strength plateau (~5+ sets). The per-session diminishing-returns claim is NOT in that paper; it comes from the sibling preprint Remmert et al. 2025 (SportRxiv doi 10.51224/SRXIV.537, posted 2 Apr 2025; PUOS ~11 fractional sets/session for hypertrophy, ~2 direct sets for strength), which is still unpublished as of 2026-09-04. (e) Refalo et al. 2023 Sports Med 53(3):649-665 (epub Nov 2022) shows failure is not superior to non-failure (partial support); the 'farther from failure = less' leg is better supported by Robinson, Pelland, Remmert et al. 2024 Sports Med 54(9):2209-31 (hypertrophy increases as estimated RIR falls) and Refalo et al. 2024 J Sports Sci 42(1):85-101 (0 vs 1-2 RIR equal). (f) Schoenfeld/Grgic/Ogborn/Krieger 2017 JSCR 31(12):3508-23 supports load-independent hypertrophy (<=60% vs >60% 1RM to failure); the '~5-30 rep' framing comes from Schoenfeld et al. 2021 Sports 9(2):32 and Lopez et al. 2021 MSSE 53(6):1206-16. (g) Maeo et al. is correctly attributed but the issue year is 2023 (Eur J Sport Sci 23(7):1240-50; epub Aug 2022); long head +28.5% vs +19.6%. (h) Chaves et al. 2020 Int J Exerc Sci 13(6):859-872 is the correct training-study citation (incline gave greater thickness only at the 2nd intercostal/upper-pec site); Rodriguez-Ridao et al. 2020 IJERPH 17(19):7339 is EMG-only (30 deg maximises upper-pec EMG, >45 deg shifts to anterior deltoid) and should be cited alongside, not instead. For (i): the primary source for counting indirect work at ~0.5 is Pelland 2026 (Baz-Valle 2021 JSCR 35(3):870-8 and Brigatto 2022 JSCR 36(1):22-30 are volume papers, not fractional-set evidence); for '<5 reps less efficient per set' the best sources are Schoenfeld et al. 2016 J Sports Sci Med 15(4):715-22 (2-4 vs 8-12 reps, sets equated, moderate won for lateral thigh) and Schoenfeld et al. 2014 JSCR 28(10):2909-18 (7x3RM = 3x10RM hypertrophy but ~4x the time) - Lasevicius 2018 is about 20% 1RM being suboptimal (low LOAD, not low reps) and is misattributed; for detraining, Ogasawara 2011/2013, Hwang 2017, Bickel 2011, Halonen 2024 and Grgic 2022 support 'loss takes weeks', while Bosquet 2013 measured strength not size (partial). Paste-ready TypeScript comment blocks are in snippets.

## Citations

- **[verified]** (a) Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. J Sports Sci. 2017;35(11):1073-1082. doi:10.1080/02640414.2016.1210197. PMID 27433992. Meta-regression of 34 groups/15 studies: each additional weekly set = +0.023 ES (~+0.37% gain); higher vs lower volume within-study ES diff 0.241 (~3.9%, P=0.03); the 3-level split (<5, 5-9, 10+ sets) was a trend only (P=0.074). SUPPORTS the graded dose-response; the specific '10+ sets' cut-point is supported as a trend, not a significant threshold.
- **[verified]** (b) Schoenfeld BJ, Ogborn D, Krieger JW. Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis. Sports Med. 2016;46(11):1689-1697. doi:10.1007/s40279-016-0543-8. PMID 27102172. 10 studies; higher frequency ES 0.49 vs 0.30 (P=0.002); concluded major muscle groups should be trained at least twice weekly. SUPPORTS '>=2x/week'. Caveat: Schoenfeld BJ, Grgic J, Krieger J. J Sports Sci. 2019;37(11):1286-1295 (doi:10.1080/02640414.2018.1555906, PMID 30558493) found no frequency effect on a volume-equated basis, and Pelland 2026 found frequency's effect on hypertrophy 'compatible with negligible' - so frequency is a way to distribute volume, not an independent driver.
- **[verified]** (c) Baz-Valle E, Balsalobre-Fernandez C, Alix-Fages C, et al. A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy. J Hum Kinet. 2022;81:199-210. doi:10.2478/hukin-2022-0017. PMID 35291645; PMCID PMC8884877. (4th author Santos-Concejero J.) Journal is J Hum Kinet, as the brief guessed. 7 studies, trained men 18-35; groups <12, 12-20, >20 weekly sets: no moderate-vs-high difference for quadriceps (p=0.19) or biceps (p=0.59) but high volume better for triceps (p=0.01); recommended 12-20 sets/muscle/week. PARTIAL SUPPORT for a ~20-set ceiling (triceps contradicts it; Pelland 2026 found no clear plateau, only diminishing returns).
- **[verified]** (d) Pelland preprint is now published. Preprint: Pelland J, Remmert J, Robinson Z, et al. The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain. SportRxiv. 2024. doi:10.51224/SRXIV.460 (posted Oct 2024; v2 dated 4 Oct 2024). Published: Pelland JC, Remmert JF, Robinson ZP, et al. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains. Sports Med. 2026;56(2):481-505. doi:10.1007/s40279-025-02344-w. PMID 41343037 (accepted 14 Oct 2025, epub 4 Dec 2025; other authors Hinson SR, Zourdos MC). 67 studies/2058 participants; indirect sets weighted 1 ('total'), 0.5 ('fractional'), 0 ('direct'); fractional had strongest evidence (2xlogBF 9.96 vs total). Hypertrophy: square-root best fit, slope 0.24%/set at mean, 100% posterior slope>0, diminishing returns, NO clear plateau; MED 4 fractional sets; tiers 5-10 (~6 more sets per detectable increment), 11-18 (~8.5), 19-29 (~10.75), 30-42 (~12.5), 43+ unclear. Strength: reciprocal fit, functional plateau (MED 1 set; ~5+ sets no further detectable gain). Frequency: negligible for hypertrophy, positive w/ diminishing returns for strength. SUPPORTS fractional sets and direct/indirect distinction; supports weekly diminishing returns.
- **[verified]** (d, per-session) The 'per-session diminishing returns' claim is NOT in Pelland 2026; it is from the parallel preprint: Remmert JF, Pelland JC, Robinson ZP, et al. Is There Too Much of a Good Thing? Meta-Regressions of the Effect of Per-Session Volume on Hypertrophy and Strength. SportRxiv. 2025. doi:10.51224/SRXIV.537 (posted 2 Apr 2025, v1; other authors Hinson SR, Zourdos MC). Same 67-study dataset; hypertrophy best fit linear-log with 'fractional' sets, point of undetectable outcome superiority (PUOS) ~11 fractional sets/session (~8.2 direct sets); strength PUOS ~2 direct sets/session; authors caution PUOS is not an upper limit and data are sparse at very high per-session volumes. Its intro also states Pelland found undetectable superiority beyond ~31 fractional weekly sets for hypertrophy and ~3 for strength. As of 2026-09-04 no PubMed record exists for this paper (searched 'Remmert JF[Author]'); treat as unpublished preprint, cited as ref 117 in Pelland 2026.
- **[verified]** (e) Refalo MC, Helms ER, Trexler ET, et al. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis. Sports Med. 2023;53(3):649-665. doi:10.1007/s40279-022-01784-y. PMID 36334240; PMCID PMC9935748. (epub 5 Nov 2022; other authors Hamilton DL, Fyfe JJ.) 15 studies: trivial advantage for any 'set failure' vs non-failure (ES 0.19, p=0.045); NO advantage of momentary failure vs non-failure (ES 0.12, ns); no advantage of >25% vs 20-25% velocity loss; authors propose a non-linear relationship. PARTIAL SUPPORT: backs 'near-failure (~0-3 RIR) ~ failure' but does not itself quantify a fall-off farther from failure. Related: Refalo MC, Helms ER, Hamilton DL, et al. scoping review, J Sports Sci. 2022;40(12):1369-1391, doi:10.1080/02640414.2022.2080165, PMID 35658845 (this is the J Sports Sci paper the brief may be conflating).
- **[verified]** (e, supporting the 'farther from failure = less' leg) Robinson ZP, Pelland JC, Remmert JF, et al. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. Sports Med. 2024;54(9):2209-2231. doi:10.1007/s40279-024-02069-2. PMID 38970765. (Other authors Refalo MC, Jukic I, Steele J, Zourdos MC.) Hypertrophy marginal slope for estimated RIR was negative with CI excluding null (muscle growth increases as sets end closer to failure); strength unaffected across a wide RIR range; authors call it exploratory with modest fit. Also: Refalo MC, Helms ER, Robinson ZP, et al. Similar muscle hypertrophy following eight weeks of resistance training to momentary muscular failure or with repetitions-in-reserve in resistance-trained individuals. J Sports Sci. 2024;42(1):85-101. doi:10.1080/02640414.2024.2321021. PMID 38393985 (0 RIR vs 1-2 RIR: identical quad thickness gains, 0.181 vs 0.182 cm). Together these SUPPORT the constant as written (0-3 RIR similar, gradual decline beyond).
- **[verified]** (f) Schoenfeld BJ, Grgic J, Ogborn D, et al. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis. J Strength Cond Res. 2017;31(12):3508-3523. doi:10.1519/JSC.0000000000002200. PMID 28834797. (4th author Krieger JW.) 21 studies, sets to failure, low <=60% 1RM vs high >60% 1RM: hypertrophy similar, 1RM strength favours high load. SUPPORTS load-equivalence for hypertrophy. The '~5-30 reps' phrasing is not in this paper; it derives from Schoenfeld BJ, Grgic J, Van Every DW, et al. Sports (Basel). 2021;9(2):32, doi:10.3390/sports9020032, PMID 33671664 (hypertrophy across ~30-80%+ 1RM) and Lopez P, Radaelli R, Taaffe DR, et al. Med Sci Sports Exerc. 2021;53(6):1206-1216, doi:10.1249/MSS.0000000000002585, PMID 33433148 (network MA: >15RM vs 9-15RM vs <=8RM to failure, no hypertrophy difference).
- **[verified]** (g) Maeo S, Wu Y, Huang M, et al. Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position. Eur J Sport Sci. 2023;23(7):1240-1250. doi:10.1080/17461391.2022.2100279. PMID 35819335. (Other authors Sakurai H, Kusagawa Y, Sugiyama T, Kanehisa H, Isaka T.) Published online 11 Aug 2022 - the brief's '2022' is the epub year; the citable issue year is 2023. Within-subject, 21 adults, 12 wk cable extensions 70% 1RM: long head volume +28.5% overhead vs +19.6% neutral (d=0.61); lateral/medial heads +14.6% vs +10.5%; whole triceps +19.9% vs +13.9%, despite ~35% lower absolute loads. SUPPORTS the constant.
- **[verified]** (h) Chaves SFN, Rocha-Junior VA, Encarnacao IGA, et al. Effects of Horizontal and Incline Bench Press on Neuromuscular Adaptations in Untrained Young Men. Int J Exerc Sci. 2020;13(6):859-872. doi:10.70252/FDNB1158 (DOI assigned retroactively by the journal; may not resolve in older reference tools). PMID 32922646; PMCID PMC7449336. (Other authors Martins-Costa HC, Freitas EDS, Coelho DB, Franco FSC, Loenneke JP, Bottaro M, Ferreira-Junior JB.) 47 untrained men, 8 wk, 1x/week, sets equated: incline group had greater pec thickness at the 2nd intercostal space (upper pec) vs horizontal (+0.62 cm, p=0.003) and vs combination; no difference at other 2 sites; strength changes similar. The brief's attribution is CORRECT for the hypertrophy claim (partial support: 1 of 3 sites, untrained, low frequency). Rodriguez-Ridao D, Antequera-Vique JA, Martin-Fuentes I, et al. (4th Muyor JM). Effect of Five Bench Inclinations on the Electromyographic Activity of the Pectoralis Major, Anterior Deltoid, and Triceps Brachii during the Bench Press Exercise. Int J Environ Res Public Health. 2020;17(19):7339. doi:10.3390/ijerph17197339. PMID 33049982; PMCID PMC7579505 - EMG only (30 trained adults, 60% 1RM): upper-pec EMG peaks at 30 deg; 0 deg best for mid/lower pec; anterior deltoid dominates at 60 deg. Cite both: Chaves for hypertrophy, Rodriguez-Ridao for the 30 deg angle/EMG. Older EMG support: Trebs AA, Brandenburg JP, Pitney WA. J Strength Cond Res. 2010;24(7):1925-1930, doi:10.1519/JSC.0b013e3181ddfae7, PMID 20512064 (clavicular head greater at 44-56 deg vs 0); Lauver JD, Cayot TE, Scheuermann BW. Eur J Sport Sci. 2016;16(3):309-316, doi:10.1080/17461391.2015.1022605, PMID 25799093.
- **[verified]** (i1) Best primary source for counting indirect/secondary muscle work at ~0.5 set is Pelland JC et al. Sports Med 2026;56(2):481-505 (fractional = indirect x 0.5 + direct; 'very strong evidence' fractional outperforms total and direct for both hypertrophy and strength), corroborated per-session by Remmert et al. 2025 preprint (fractional best for hypertrophy). Definition used: for hypertrophy, direct = measured muscle is the primary force generator; indirect = meaningfully trained synergist. The other candidates are NOT fractional-set evidence: Baz-Valle E, Fontes-Villalba M, Santos-Concejero J. Total Number of Sets as a Training Volume Quantification Method for Muscle Hypertrophy: A Systematic Review. J Strength Cond Res. 2021;35(3):870-878. doi:10.1519/JSC.0000000000002776. PMID 30063555 (validates counting hard sets in the 6-20+ rep range as the volume metric); Brigatto FA, Lima LEM, Germano MD, et al. High Resistance-Training Volume Enhances Muscle Thickness in Resistance-Trained Men. J Strength Cond Res. 2022;36(1):22-30. doi:10.1519/JSC.0000000000003413. PMID 31868813 (16/24/32 weekly sets RCT; 32 > 16 for lower body and triceps thickness).
- **[verified]** (i2) Very low reps (<5) being less efficient per set for hypertrophy: best set-matched primary source is Schoenfeld BJ, Contreras B, Vigotsky AD, et al. (4th Peterson M). Differential Effects of Heavy Versus Moderate Loads on Measures of Strength and Hypertrophy in Resistance-Trained Men. J Sports Sci Med. 2016;15(4):715-722. No DOI on PubMed; PMID 27928218; PMCID PMC5131226 (3 sets of 2-4 reps vs 3 sets of 8-12 reps, 8 wk: moderate produced greater lateral-thigh thickness; heavy greater squat 1RM). Volume-equated support: Schoenfeld BJ, Ratamess NA, Peterson MD, et al. Effects of different volume-equated resistance training loading strategies on muscular adaptations in well-trained men. J Strength Cond Res. 2014;28(10):2909-2918. doi:10.1519/JSC.0000000000000480. PMID 24714538 (7x3RM vs 3x10RM: similar biceps thickness but heavy took far longer per session - equal growth needed ~2.3x the sets). Schoenfeld 2017 JSCR meta compared <=60% vs >60% 1RM and does not isolate <5 reps. Lasevicius T, Ugrinowitsch C, Schoenfeld BJ, et al. Eur J Sport Sci. 2018;18(6):772-780. doi:10.1080/17461391.2018.1450898. PMID 29564973 is MISATTRIBUTED for this point: it showed 20% 1RM (very LIGHT, high-rep) was suboptimal vs 40/60/80% at equated volume-load - it supports a lower load floor (~30% 1RM), not a low-rep penalty.
- **[verified]** (i3) Detraining timelines (muscle loss takes weeks, not days): Ogasawara R, Yasuda T, Ishii N, et al. (4th Abe T). Comparison of muscle hypertrophy following 6-month of continuous and periodic strength training. Eur J Appl Physiol. 2013;113(4):975-985. doi:10.1007/s00421-012-2511-9. PMID 23053130 (3-wk detraining/6-wk retraining cycles gave the same 24-wk triceps/pec CSA gains as continuous training). Ogasawara R, Yasuda T, Sakamaki M, et al. Effects of periodic and continued resistance training on muscle CSA and strength in previously untrained men. Clin Physiol Funct Imaging. 2011;31(5):399-404. doi:10.1111/j.1475-097X.2011.01031.x. PMID 21771261 (no significant CSA or 1RM decrease after 3 weeks detraining). Hwang PS, Andre TL, McKinley-Barnard SK, et al. Resistance Training-Induced Elevations in Muscular Strength in Trained Men Are Maintained After 2 Weeks of Detraining and Not Differentially Affected by Whey Protein Supplementation. J Strength Cond Res. 2017;31(4):869-881. doi:10.1519/JSC.0000000000001807. PMID 28328712 (2-wk detraining: leg press strength and lean mass retained). Bosquet L, Berryman N, Dupuy O, et al. Effect of training cessation on muscular performance: a meta-analysis. Scand J Med Sci Sports. 2013;23(3):e140-e149. doi:10.1111/sms.12047. PMID 23347054 - measures STRENGTH/power, not muscle size, with a dose-response to cessation duration; PARTIAL support only. Additional: Bickel CS, Cross JM, Bamman MM. Med Sci Sports Exerc. 2011;43(7):1177-1187. doi:10.1249/MSS.0b013e318207c15d. PMID 21131862 (1/9 of training dose maintained hypertrophy for 32 wk in young adults); Halonen EJ, Gabriel I, Kelahaara MM, et al. Scand J Med Sci Sports. 2024;34(10):e14739. doi:10.1111/sms.14739. PMID 39364857 (10-wk break lost CSA but regained within ~5 wk; final outcomes equal); Grgic J. Int J Environ Res Public Health. 2022;19(21):14048. doi:10.3390/ijerph192114048. PMID 36360927 (older adults: no significant size loss at 12-24 wk cessation, significant at 31-52 wk). Also useful for (a): Schoenfeld BJ, Contreras B, Krieger J, et al. Med Sci Sports Exerc. 2019;51(1):94-103. doi:10.1249/MSS.0000000000001764. PMID 30153194 (1 vs 3 vs 5 sets/exercise x3/wk in trained men: hypertrophy dose-response, strength equal).
- **[likely]** Pelland SportRxiv preprint posting date: the SportRxiv record shows Version 1 and Version 2 both dated 4 Oct 2024 and bibbase lists it as 2024; the exact v1 date could not be independently confirmed beyond the SportRxiv page.

## Attribution corrections and open questions for the humans

- Brief item (d) conflates two papers: the weekly-volume meta-regression (Pelland et al., now Sports Med 2026;56(2):481-505) and the per-session analysis (Remmert et al. 2025 SportRxiv preprint). The per-session diminishing-returns constant should cite Remmert 2025 (doi 10.51224/SRXIV.537), which is still an unpublished preprint as of 2026-09-04 - decide whether an unreviewed preprint is acceptable for a shipped constant.
- Brief item (c): Baz-Valle 2022 found >20 sets was BETTER for triceps and only 'no difference' for quads/biceps; Pelland 2026 found no plateau at all (only rising cost per increment, tiers up to 30-42 sets/wk). A hard 'ceiling at ~20' is therefore only partially supported; the citation is right but the claim wording may overstate it.
- Brief item (g): Maeo et al. is formally a 2023 issue paper (Eur J Sport Sci 23(7):1240-1250) with epub 2022 - pick one convention for 'year' across all constants (issue year recommended).
- Brief item (i2): Lasevicius 2018 is misattributed - it shows 20% 1RM (very light load, high reps) is suboptimal, not that <5 reps are inefficient. Use Schoenfeld 2016 J Sports Sci Med (2-4 vs 8-12 reps, sets equated) and Schoenfeld 2014 JSCR (7x3RM vs 3x10RM) instead; note no meta-analysis isolates <5-rep sets specifically.
- Brief item (i3): Bosquet 2013 measured strength/power, not muscle size. If the copy rule is about muscle SIZE, lead with Ogasawara 2011/2013, Hwang 2017 and Bickel 2011; Bosquet only supports the performance side.
- Brief item (b): the 2016 frequency meta-analysis has effectively been superseded by Schoenfeld/Grgic/Krieger 2019 and Pelland 2026 (no frequency effect on hypertrophy when volume is equated). If the engine rewards 2x/week independent of volume, the citation supports the heuristic but the newer evidence does not support a standalone bonus.
- Brief item (h): Chaves 2020 is a small, once-weekly, untrained-subject study showing an upper-pec advantage at 1 of 3 sites; Rodriguez-Ridao 2020 is EMG only. No trained-population hypertrophy trial on incline angle was found - the constant is plausibly supported but weakly.
- Chaves 2020's DOI (10.70252/FDNB1158) was assigned retroactively by Int J Exerc Sci; confirm it resolves in whatever citation tooling you use, or cite by PMID 32922646 / PMC7449336.
- Refalo 2023 Sports Med does not quantify RIR in the 'non-failure' arms; the 'similar at 0-3 RIR' band is an inference from Refalo 2024 (0 vs 1-2 RIR) and Robinson 2024 (continuous decline in hypertrophy per RIR, exploratory, modest model fit). A newer within-subject RCT (Vasconcelos et al., J Strength Cond Res 2026, doi 10.1519/JSC.0000000000005494, 1-3 RIR ~ failure) could be added once it has volume/page numbers.
- Exact first-posted date of the Pelland SportRxiv preprint could only be confirmed as October 2024 (v1/v2 both stamped 4 Oct 2024 on the SportRxiv page).

## Paste-ready comment blocks

### src/engine/constants.ts

```ts
/**
 * MuscleMap engine constants - scientific references.
 * Citation style: first 3 authors then et al.; journal abbreviations per PubMed.
 * Verified against PubMed / publisher records on 2026-09-04.
 *
 * [A] WEEKLY VOLUME DOSE-RESPONSE (~10+ sets/week/muscle -> more hypertrophy)
 *     Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly
 *     resistance training volume and increases in muscle mass: A systematic review and
 *     meta-analysis. J Sports Sci. 2017;35(11):1073-1082.
 *     doi:10.1080/02640414.2016.1210197. PMID 27433992.
 *     Finding: +0.37% muscle gain per additional weekly set (P=0.002); higher vs lower
 *     volume +3.9%; the <5 / 5-9 / 10+ split was a trend (P=0.074). Supports the graded
 *     relationship; the 10-set cut-point is a heuristic, not a significant threshold.
 *     See also Schoenfeld BJ, Contreras B, Krieger J, et al. Med Sci Sports Exerc.
 *     2019;51(1):94-103. doi:10.1249/MSS.0000000000001764. PMID 30153194 (RCT, trained men).
 *
 * [B] FREQUENCY >= 2x/WEEK PER MUSCLE
 *     Schoenfeld BJ, Ogborn D, Krieger JW. Effects of Resistance Training Frequency on
 *     Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis. Sports Med.
 *     2016;46(11):1689-1697. doi:10.1007/s40279-016-0543-8. PMID 27102172.
 *     Finding: ES 0.49 (higher) vs 0.30 (lower frequency), P=0.002; train each muscle
 *     at least twice weekly. CAVEAT: frequency effect disappears when volume is equated -
 *     Schoenfeld BJ, Grgic J, Krieger J. J Sports Sci. 2019;37(11):1286-1295.
 *     doi:10.1080/02640414.2018.1555906. PMID 30558493 - and Pelland et al. [D] found
 *     frequency's effect on hypertrophy 'compatible with negligible'. Treat 2x/week as a
 *     volume-distribution rule, not an independent growth driver.
 *
 * [C] HIGH-VOLUME DIMINISHING RETURNS (~>20 sets/week)
 *     Baz-Valle E, Balsalobre-Fernandez C, Alix-Fages C, et al. A Systematic Review of
 *     The Effects of Different Resistance Training Volumes on Muscle Hypertrophy.
 *     J Hum Kinet. 2022;81:199-210. doi:10.2478/hukin-2022-0017. PMID 35291645.
 *     Finding: 12-20 vs >20 weekly sets - no difference for quadriceps (p=0.19) or biceps
 *     (p=0.59); >20 sets better for triceps (p=0.01); recommends 12-20 sets/muscle/week.
 *     PARTIAL support for a ~20-set ceiling. [D] finds diminishing returns but no plateau.
 *
 * [D] VOLUME DOSE-RESPONSE META-REGRESSION (fractional sets, direct vs indirect)
 *     Pelland JC, Remmert JF, Robinson ZP, et al. The Resistance Training Dose Response:
 *     Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle
 *     Hypertrophy and Strength Gains. Sports Med. 2026;56(2):481-505.
 *     doi:10.1007/s40279-025-02344-w. PMID 41343037. (Epub 2025-12-04.)
 *     Preprint: SportRxiv 2024. doi:10.51224/SRXIV.460.
 *     Finding: 67 studies / 2058 participants. Indirect (synergist) sets count best as
 *     0.5 set ('fractional'). Hypertrophy: square-root curve, slope ~0.24%/set at the mean,
 *     diminishing returns, no clear plateau; minimum effective dose 4 fractional sets/wk;
 *     efficiency tiers 5-10, 11-18, 19-29, 30-42 sets/wk (43+ = insufficient data).
 *     Strength: functional plateau by ~5 fractional sets/wk. Frequency: negligible for
 *     hypertrophy, positive w/ diminishing returns for strength.
 *
 * [D2] PER-SESSION DIMINISHING RETURNS (preprint, not yet peer-reviewed as of 2026-09)
 *     Remmert JF, Pelland JC, Robinson ZP, et al. Is There Too Much of a Good Thing?
 *     Meta-Regressions of the Effect of Per-Session Volume on Hypertrophy and Strength.
 *     SportRxiv. 2025. doi:10.51224/SRXIV.537.
 *     Finding: positive per-session dose-response with diminishing returns; point of
 *     undetectable outcome superiority ~11 fractional sets/session (hypertrophy),
 *     ~2 direct sets/session (strength). Authors caution this is not an upper limit.
 *
 * [E] PROXIMITY TO FAILURE (0-3 RIR ~ equivalent; farther from failure = less)
 *     Refalo MC, Helms ER, Trexler ET, et al. Influence of Resistance Training
 *     Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with
 *     Meta-analysis. Sports Med. 2023;53(3):649-665. doi:10.1007/s40279-022-01784-y.
 *     PMID 36334240. Finding: momentary failure not superior to non-failure (ES 0.12, ns);
 *     any 'set failure' vs non-failure trivial ES 0.19; likely non-linear relationship.
 *     Robinson ZP, Pelland JC, Remmert JF, et al. Exploring the Dose-Response Relationship
 *     Between Estimated Resistance Training Proximity to Failure, Strength Gain, and
 *     Muscle Hypertrophy: A Series of Meta-Regressions. Sports Med. 2024;54(9):2209-2231.
 *     doi:10.1007/s40279-024-02069-2. PMID 38970765. Finding: hypertrophy increases as
 *     estimated RIR decreases (negative slope, CI excludes 0); strength unaffected.
 *     Refalo MC, Helms ER, Robinson ZP, et al. Similar muscle hypertrophy following eight
 *     weeks of resistance training to momentary muscular failure or with
 *     repetitions-in-reserve in resistance-trained individuals. J Sports Sci.
 *     2024;42(1):85-101. doi:10.1080/02640414.2024.2321021. PMID 38393985.
 *     Finding: 0 RIR vs 1-2 RIR -> identical quadriceps growth (0.181 vs 0.182 cm).
 *
 * [F] LOAD EQUIVALENCE (~5-30 reps taken near failure)
 *     Schoenfeld BJ, Grgic J, Ogborn D, et al. Strength and Hypertrophy Adaptations
 *     Between Low- vs. High-Load Resistance Training: A Systematic Review and
 *     Meta-analysis. J Strength Cond Res. 2017;31(12):3508-3523.
 *     doi:10.1519/JSC.0000000000002200. PMID 28834797.
 *     Finding: 21 studies, sets to failure, <=60% vs >60% 1RM: similar hypertrophy;
 *     heavy loads better for 1RM strength.
 *     Rep-range framing: Schoenfeld BJ, Grgic J, Van Every DW, et al. Sports (Basel).
 *     2021;9(2):32. doi:10.3390/sports9020032. PMID 33671664; Lopez P, Radaelli R,
 *     Taaffe DR, et al. Med Sci Sports Exerc. 2021;53(6):1206-1216.
 *     doi:10.1249/MSS.0000000000002585. PMID 33433148 (<=8RM vs 9-15RM vs >15RM: equal).
 *
 * [G] TRICEPS LONG HEAD GROWS MORE WITH OVERHEAD EXTENSIONS
 *     Maeo S, Wu Y, Huang M, et al. Triceps brachii hypertrophy is substantially greater
 *     after elbow extension training performed in the overhead versus neutral arm
 *     position. Eur J Sport Sci. 2023;23(7):1240-1250. (Epub 2022-08-11.)
 *     doi:10.1080/17461391.2022.2100279. PMID 35819335.
 *     Finding: 12 wk within-subject; long head +28.5% overhead vs +19.6% neutral (d=0.61);
 *     whole triceps +19.9% vs +13.9%, despite ~35% lower absolute loads.
 *
 * [H] INCLINE ANGLE AND UPPER (CLAVICULAR) PEC
 *     Chaves SFN, Rocha-Junior VA, Encarnacao IGA, et al. Effects of Horizontal and
 *     Incline Bench Press on Neuromuscular Adaptations in Untrained Young Men.
 *     Int J Exerc Sci. 2020;13(6):859-872. doi:10.70252/FDNB1158. PMID 32922646.
 *     Finding: 8 wk, sets equated; incline group gained more pec thickness only at the
 *     2nd intercostal (upper-pec) site (+0.62 cm vs flat, p=0.003); strength similar.
 *     Rodriguez-Ridao D, Antequera-Vique JA, Martin-Fuentes I, et al. Effect of Five Bench
 *     Inclinations on the Electromyographic Activity of the Pectoralis Major, Anterior
 *     Deltoid, and Triceps Brachii during the Bench Press Exercise. Int J Environ Res
 *     Public Health. 2020;17(19):7339. doi:10.3390/ijerph17197339. PMID 33049982.
 *     Finding (EMG only): upper-pec activity peaks at 30 deg; 0 deg best for mid/lower pec;
 *     >=45-60 deg shifts work to anterior deltoid.
 *
 * [I1] INDIRECT / SECONDARY MUSCLE WORK COUNTS ~0.5 SET -> see [D] (fractional method:
 *     indirect x 0.5 + direct; strongest evidence vs 'total' or 'direct'), corroborated
 *     per-session in [D2]. Volume-metric background: Baz-Valle E, Fontes-Villalba M,
 *     Santos-Concejero J. J Strength Cond Res. 2021;35(3):870-878.
 *     doi:10.1519/JSC.0000000000002776. PMID 30063555.
 *
 * [I2] VERY LOW REPS (<5) LESS EFFICIENT PER SET FOR HYPERTROPHY
 *     Schoenfeld BJ, Contreras B, Vigotsky AD, et al. Differential Effects of Heavy Versus
 *     Moderate Loads on Measures of Strength and Hypertrophy in Resistance-Trained Men.
 *     J Sports Sci Med. 2016;15(4):715-722. PMID 27928218. PMCID PMC5131226.
 *     Finding: 3 sets of 2-4 reps vs 3 sets of 8-12 reps -> moderate load produced greater
 *     lateral-thigh thickness; heavy better for squat 1RM.
 *     Schoenfeld BJ, Ratamess NA, Peterson MD, et al. Effects of different volume-equated
 *     resistance training loading strategies on muscular adaptations in well-trained men.
 *     J Strength Cond Res. 2014;28(10):2909-2918. doi:10.1519/JSC.0000000000000480.
 *     PMID 24714538. Finding: 7x3RM matched 3x10RM for biceps growth only by using ~2.3x
 *     the sets and far longer sessions.
 *     Low-LOAD floor (not low reps): Lasevicius T, Ugrinowitsch C, Schoenfeld BJ, et al.
 *     Eur J Sport Sci. 2018;18(6):772-780. doi:10.1080/17461391.2018.1450898.
 *     PMID 29564973 (20% 1RM suboptimal vs 40-80% at equated volume-load).
 *
 * [I3] DETRAINING: MUSCLE LOSS TAKES WEEKS, NOT DAYS ("a red muscle has not shrunk")
 *     Ogasawara R, Yasuda T, Ishii N, et al. Comparison of muscle hypertrophy following
 *     6-month of continuous and periodic strength training. Eur J Appl Physiol.
 *     2013;113(4):975-985. doi:10.1007/s00421-012-2511-9. PMID 23053130.
 *     Finding: 3-wk breaks every 6 wk -> same 24-wk CSA gain as continuous training.
 *     Ogasawara R, Yasuda T, Sakamaki M, et al. Clin Physiol Funct Imaging.
 *     2011;31(5):399-404. doi:10.1111/j.1475-097X.2011.01031.x. PMID 21771261.
 *     Finding: no significant CSA or 1RM loss after 3 wk of detraining.
 *     Hwang PS, Andre TL, McKinley-Barnard SK, et al. J Strength Cond Res.
 *     2017;31(4):869-881. doi:10.1519/JSC.0000000000001807. PMID 28328712.
 *     Finding: 2-wk detraining in trained men - strength and lean mass retained.
 *     Bosquet L, Berryman N, Dupuy O, et al. Effect of training cessation on muscular
 *     performance: a meta-analysis. Scand J Med Sci Sports. 2013;23(3):e140-e149.
 *     doi:10.1111/sms.12047. PMID 23347054. Finding: strength (not size) declines with a
 *     dose-response to cessation duration - supports 'weeks, not days' for performance.
 *     Bickel CS, Cross JM, Bamman MM. Med Sci Sports Exerc. 2011;43(7):1177-1187.
 *     doi:10.1249/MSS.0b013e318207c15d. PMID 21131862 (1/9 dose maintains size 32 wk).
 *     Halonen EJ, Gabriel I, Kelahaara MM, et al. Scand J Med Sci Sports.
 *     2024;34(10):e14739. doi:10.1111/sms.14739. PMID 39364857 (10-wk break regained in ~5 wk).
 */
```
