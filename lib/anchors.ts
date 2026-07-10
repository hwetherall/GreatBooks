/**
 * Curated anchor passages — the famous lines of Book I, pre-highlighted in
 * the reader. Each carries an editorial angle that steers the premium-model
 * annotation toward its strongest insight (same approach as the section
 * prompts in sections.ts). Annotations are generated once per knowledge
 * level, cached, and served instantly thereafter.
 */

export interface Anchor {
  id: string;
  lineStart: number;
  lineEnd: number;
  /** The insight the annotation must land. Injected into the system prompt. */
  angle: string;
}

export const BOOK_1_ANCHORS: Anchor[] = [
  {
    id: "proposition",
    lineStart: 1,
    lineEnd: 6,
    angle: `The whole opening is one long suspended sentence, and its main verb — "Sing" — does not arrive until line 6. This is Latin epic syntax transplanted into English: Virgil opens the Aeneid with "arma virumque cano" ("arms and the man I sing"), the verb declared in the first breath; Milton holds his back like a suspended chord, forcing English to behave like Latin. Also worth the reader's notice: "fruit" carries a double meaning — the literal apple and the consequences ("fruits") of the act. The audacity of announcing, in the poem's very grammar, a contest with Homer and Virgil.`,
  },
  {
    id: "unattempted",
    lineStart: 16,
    lineEnd: 16,
    angle: `Milton lifted this line almost word-for-word from Ariosto's Orlando Furioso — "cosa non detta in prosa mai né in rima," "a thing never said before in prose or rhyme." He claims total originality using a borrowed sentence, and he knew his educated readers would catch the theft. What does it mean to announce you are attempting the unattempted in someone else's words? He is not hiding the debt; he is trumping it — this is how Renaissance poets declared war on their predecessors.`,
  },
  {
    id: "justify",
    lineStart: 26,
    lineEnd: 26,
    angle: `"Justify" is a legal and theological term — to acquit, to declare righteous. A blind man whose cause lost the civil war, whose books were burned, who narrowly escaped execution at the Restoration, announces he will put God's government of the universe on trial and win the case before human readers. Note the direction of the argument: not justifying men to God, but God to men — as if mankind were the judge and God the defendant. The whole poem hangs on whether he can pull this off.`,
  },
  {
    id: "darkness-visible",
    lineStart: 63,
    lineEnd: 63,
    angle: `Not a decorative paradox but theological precision: Hell's flames give no light, yet the damned can see. The light exists only to reveal what has been lost — enough illumination to perceive sorrow, none to offer relief. In Milton's Hell there is no merciful numbness or unconsciousness; full awareness is the punishment. This oxymoron has haunted English ever since (it gave William Styron the title for his memoir of depression).`,
  },
  {
    id: "field-be-lost",
    lineStart: 105,
    lineEnd: 106,
    angle: `This is the rhetoric of the defeated cause — and Milton knew it from the inside. He had served a revolution that lost everything at the Restoration seven years before publication; his friends were executed or imprisoned. Satan's insistence that defeat in the field does not mean defeat of the will echoes exactly what beaten causes tell themselves. The reader should feel the discomfort: Milton gives his own consolations to Satan. And note the enjambment — "What though the field be lost?" ends the line, and "All is not lost" answers across the break, defiance leaping the gap.`,
  },
  {
    id: "mind-its-own-place",
    lineStart: 254,
    lineEnd: 255,
    angle: `This sounds like wisdom — it is nearly Stoicism, the doctrine of Epictetus and Marcus Aurelius that the mind, not circumstance, determines our condition. Generations have quoted it as inspiration. But the reader should be invited to hold both readings at once: is this the triumph of an unconquerable spirit, or precisely the lie a damned being must tell himself — the claim that inner assertion can overturn reality? Milton makes the most seductive line in Hell a philosophical half-truth, and gives the reader no footnote to resolve it.`,
  },
  {
    id: "reign-in-hell",
    lineStart: 263,
    lineEnd: 263,
    angle: `Beyond the famous Romantic-versus-orthodox debate, give the reader the source Milton's audience heard instantly: in Odyssey book 11, the shade of Achilles tells Odysseus he would rather be a hired labourer serving a landless farmer than king over all the dead. It is the wisest thing a dead hero ever says in classical epic — glory is worthless next to life. Satan reverses it exactly: better to reign among the dead than serve in the light. A 1667 reader heard Achilles behind this line and understood that Satan gets the oldest lesson in epic literature precisely backwards.`,
  },
  {
    id: "like-an-exhalation",
    lineStart: 710,
    lineEnd: 712,
    angle: `Two things the modern reader walks past. First, the stagecraft: in the court masques of the Stuart kings, elaborate scenery — palaces, temples — rose from beneath the stage through trapdoors, to music, exactly "like an exhalation"; Milton is describing Hell's capital appearing with the theatrical machinery of royal entertainment. Second, the politics: Charles II's restored court was spending lavishly on grand classical architecture while Milton, who had served the defeated republic, lived in obscurity. Hell's capital rising effortlessly, gorgeously, to sweet music — evil that looks graceful — was aimed at an audience he despised.`,
  },
];

export function getAnchorById(id: string): Anchor | undefined {
  return BOOK_1_ANCHORS.find((a) => a.id === id);
}

/** Maps a line number to the anchor covering it, if any. */
export function getAnchorForLine(lineNumber: number): Anchor | undefined {
  return BOOK_1_ANCHORS.find(
    (a) => lineNumber >= a.lineStart && lineNumber <= a.lineEnd
  );
}
