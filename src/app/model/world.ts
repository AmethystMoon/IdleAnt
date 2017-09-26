import { Cost } from './cost';
import { GameModel } from './gameModel';
import { Unit } from './units/unit';
import { Base } from './units/base';
import { Action } from './units/action';

export class World {

  static worldPrefix: World[]
  static worldTypes: World[]
  static worldSuffix: World[]

  public prestige: Action
  public level = 1

  constructor(
    public game: GameModel,
    public name: string,
    public description: string,
    public avaiableUnits: Base[],
    public prodMod: [Unit, decimal.Decimal][],
    public toUnlock: Cost[],
    public unitMod: [Unit, decimal.Decimal][] = [],
    public unitPrice: [Unit, decimal.Decimal][] = [],
    public unlockedUnits: [Base, decimal.Decimal][] = [],
    public experience = Decimal(2.5),
    public toUnlockMax = new Array<Cost>()
  ) { }

  static getBaseWorld(game: GameModel): World {
    const baseWorld = new World(game, "Home", "Nothing special.",
      [],
      [],
      [
        new Cost(game.food, Decimal(1E1)),
        new Cost(game.nestAnt, Decimal(100))
      ]
    )
    baseWorld.experience = Decimal(10)
    return baseWorld
  }
  static getRandomWorld(game: GameModel): World {
    const worldRet = this.getBaseWorld(game)
    worldRet.experience = Decimal(0)

    const worldType = World.worldTypes[Math.floor(Math.random() * (World.worldTypes.length))]
    const worldPrefix = World.worldPrefix[Math.floor(Math.random() * (World.worldPrefix.length))]
    const worldSuffix = World.worldSuffix[Math.floor(Math.random() * (World.worldSuffix.length))]

    const worlds = [worldType, worldPrefix, worldSuffix, this.getBaseWorld(game)]
    worldRet.name = worldPrefix.name + " " + worldType.name + " " + worldSuffix.name
    worldRet.description = worldPrefix.description +
      (!!worldType.description ? '\n' + worldType.description : "") +
      (!!worldSuffix.description ? '\n' + worldSuffix.description : "")

    worlds.forEach(w => {
      w.prodMod.forEach(p => {
        const prod = worldRet.prodMod.find(p1 => p1[0].id === p[0].id)
        if (prod)
          prod[1] = prod[1].times(p[1])
        else
          worldRet.prodMod.push([p[0], p[1]])
      })
      w.unitMod.forEach(p => {
        const prod = worldRet.unitMod.find(p1 => p1[0].id === p[0].id)
        if (prod)
          prod[1] = prod[1].times(p[1])
        else
          worldRet.unitMod.push([p[0], p[1]])
      })
      w.unitPrice.forEach(p => {
        const prod = worldRet.unitPrice.find(p1 => p1[0].id === p[0].id)
        if (prod)
          prod[1] = prod[1].times(p[1])
        else
          worldRet.unitPrice.push([p[0], p[1]])
      })
      w.toUnlock.forEach(p => {
        const toUnlock = worldRet.toUnlock.find(c => c.unit.id === p.unit.id)
        if (toUnlock)
          toUnlock.basePrice = toUnlock.basePrice.plus(p.basePrice)
        else
          worldRet.toUnlock.push(new Cost(p.unit, p.basePrice))
      })
      w.toUnlockMax.forEach(p => {
        const toUnlockMax = worldRet.toUnlockMax.find(c => c.unit.id === p.unit.id)
        if (toUnlockMax)
          toUnlockMax.basePrice = toUnlockMax.basePrice.plus(p.basePrice)
        else
          worldRet.toUnlockMax.push(new Cost(p.unit, p.basePrice))
      })
      w.unlockedUnits.forEach(p => {
        const unlockedUnits = worldRet.unlockedUnits.find(p1 => p1[0].id === p[0].id)
        if (unlockedUnits)
          unlockedUnits[1] = unlockedUnits[1].plus(p[1])
        else
          worldRet.unlockedUnits.push([p[0], p[1]])
      })
      worldRet.experience = worldRet.experience.plus(w.experience)
      worldRet.avaiableUnits = worldRet.avaiableUnits.concat(w.avaiableUnits)
    })

    //  remove default stat
    worldRet.prodMod = worldRet.prodMod.filter(pm => pm[1].minus(1).abs().greaterThan(Number.EPSILON))
    worldRet.unitMod = worldRet.unitMod.filter(pm => pm[1].minus(1).abs().greaterThan(Number.EPSILON))
    worldRet.unitPrice = worldRet.unitPrice.filter(pm => pm[1].minus(1).abs().greaterThan(Number.EPSILON))

    worldRet.avaiableUnits = Array.from(new Set(worldRet.avaiableUnits))
    worldRet.experience = worldRet.experience.minus(7.5)

    //    Set the world level
    let maxLevel = game.allPrestigeUp.map(u => u.quantity).reduce((prev, prest) => prev.plus(prest)).plus(game.experience.quantity)
    maxLevel = maxLevel.greaterThan(7) ? Decimal(maxLevel.minus(6).div(2), 1.15).floor() : maxLevel
    worldRet.level = Math.min(maxLevel.times(Decimal.random()).floor().toNumber(), 100)

    const toUnlockMultiplier = Decimal.pow(1.07, worldRet.level)
    const expMultiplier = Decimal.pow(1.075, worldRet.level)
    worldRet.toUnlock.forEach(t => t.basePrice = t.basePrice.times(toUnlockMultiplier))
    worldRet.experience = worldRet.experience.times(expMultiplier)

    return worldRet
  }
  static initialize(game: GameModel) {
    World.worldTypes = [
      new World(game, "Park", "",
        [],
        [],
        []
      ),
      new World(game, "Beach", "A beach",
        [game.sandDigger, game.sandEnginer],
        [[game.sand, Decimal(1.5)], [game.fungus, Decimal(0.7)]],
        [new Cost(game.crabQueen, Decimal(200))],
        [[game.fungus, Decimal(0.7)]],
        [],
        [[game.seaRes, Decimal(0)]],
        Decimal(3.5)
      ),
      new World(game, "Forest", "A forest",
        [
          game.woodEnginer, game.loggingMachine,
          game.disinfestationBeetle, game.flametrowerBeetle
        ],
        [[game.wood, Decimal(2)]],
        [new Cost(game.beetleColony, Decimal(500))],
        [],
        [],
        [[game.beetleResearch, Decimal(0)]],
        Decimal(4.5)
      ),
      new World(game, "Mine", "A mine",
        [game.mine, game.mineEnginer],
        [
          [game.cristal, Decimal(1.2)],
          [game.wood, Decimal(0.8)],
          [game.fungus, Decimal(0.8)]
        ],
        []
      )
    ]

    World.worldPrefix = [
      new World(game, "", "", [], [], []),
      new World(game, "Cold", "",
        [],
        [[game.food, Decimal(0.7)], [game.ice, Decimal(0.5)]],
        [],
        [],
        [],
        [[game.iceResearch, Decimal(0)]]
      ),
      new World(game, "Freezing", "",
        [
          game.iceCollector, game.iceCompacter,
          game.iceCompEngineer, game.iceCompEngineer,
          game.burningGlass, game.lensEnginer
        ],
        [[game.food, Decimal(0.4)]],
        [],
        [],
        [],
        [[game.ice, Decimal(1E12)], [game.iceResearch, Decimal(0)]],
        Decimal(4.5),
        [new Cost(game.ice, Decimal(100))]
      ),
      new World(game, "Hot", "",
        [],
        [[game.food, Decimal(2)]],
        []
      ),
      new World(game, "Arid", "",
        [],
        [[game.fungus, Decimal(0.5)]],
        []
      ),
      new World(game, "Wooded", "",
        [game.woodEnginer, game.loggingMachine],
        [[game.wood, Decimal(2)]],
        []
      ),
      new World(game, "Crystallized", "",
        [game.mine, game.mineEnginer],
        [
          [game.cristal, Decimal(1.5)],
          [game.food, Decimal(0.4)],
          [game.fungus, Decimal(0.4)]
        ],
        []
      ),
      new World(game, "Dying", "",
        [],
        [
          [game.food, Decimal(0.5)],
          [game.fungus, Decimal(0.5)],
          [game.wood, Decimal(0.5)],
          [game.honey, Decimal(0.5)],
          [game.nectar, Decimal(0.5)]
        ],
        [],
        [],
        [],
        [],
        Decimal(3.5)
      ),
      new World(game, "Rainy", "",
        [],
        [
          [game.wood, Decimal(1.5)],
          [game.fungus, Decimal(1.5)]
        ], []
      ),
      new World(game, "Foggy", "",
        [],
        [
          [game.wood, Decimal(0.7)],
          [game.fungus, Decimal(0.7)]
        ], []
      ),
      new World(game, "Technological", "",
        [],
        [
          [game.science, Decimal(1.5)]
        ], []
      ),
      new World(game, "Infested", "",
        [game.basicDisinfestationRes],
        [],
        [],
        [],
        [],
        [
          [game.poisonousPlant, Decimal(1E10)],
          [game.poisonousPlant2, Decimal(1E3)]
        ],
        Decimal(5.5),
        [new Cost(game.poisonousPlant, Decimal(100))]
      )
    ]

    World.worldSuffix = [
      new World(game, "", "", [], [], []),
      new World(game, "of Fungus", "",
        [],
        [[game.fungus, Decimal(2)]],
        [new Cost(game.fungus, Decimal(1000))]
      ),
      new World(game, "of Bee", "",
        [], [], [],
        [[game.foragingBee, Decimal(2)]], [],
        [[game.beeResearch, Decimal(0)]]
      ),
      new World(game, "of Ant", "",
        [], [], [],
        [[game.littleAnt, Decimal(2)]]
      ),
      new World(game, "of Scientist", "",
        [], [], [],
        [[game.student, Decimal(2)]]
      ),
      new World(game, "of Farming", "",
        [], [], [],
        [[game.farmer, Decimal(2)]]
      ),
      new World(game, "of Cristall", "",
        [game.mine, game.mineEnginer],
        [[game.cristal, Decimal(2)]],
        []
      ),
      new World(game, "of Infestation", "",
        [game.basicDisinfestationRes],
        [],
        [],
        [],
        [],
        [
          [game.poisonousPlant, Decimal(1E10)],
          [game.poisonousPlant2, Decimal(1E3)]
        ],
        Decimal(5.5),
        [new Cost(game.poisonousPlant, Decimal(100))]
      )
    ]

  }

  goTo(skip = false) {
    const le = this.game.lifeEarning
    const exp = this.game.experience.quantity.plus(this.game.getExperience())
    this.game.setInitialStat()
    if (!skip) {
      this.game.experience.quantity = exp
      this.game.prestigeDone = this.game.prestigeDone.plus(1)
    }
    if (this.avaiableUnits)
      this.avaiableUnits.forEach(u => u.avabileThisWorld = true)
    if (this.unlockedUnits) {
      this.unlockedUnits.forEach(u => {
        u[0].avabileThisWorld = true
        u[0].quantity = u[1]
      })
      this.game.unlockUnits(this.unlockedUnits.map(u => u[0]))()
    }
    if (this.prodMod)
      this.prodMod.forEach(p => p[0].worldProdModifiers = p[1])
    if (this.unitMod)
      this.unitMod.forEach(p => p[0].worldEffModifiers = p[1])
    if (this.unitPrice)
      this.unitPrice.forEach(p => p[0].worldBuyModifiers = p[1])


    this.game.world = this
    this.game.world.generateAction(this.game)


  }
  getData() {
    const data: any = {}
    data.n = this.name
    if (this.avaiableUnits)
      data.a = this.avaiableUnits.map(b => b.id)
    if (this.prodMod)
      data.p = this.prodMod.map(p => [p[0].id, p[1]])
    data.t = this.toUnlock.map(c => c.getData())
    data.um = this.unitMod.map(up => [up[0].id, up[1]])
    data.up = this.unitPrice.map(up => [up[0].id, up[1]])
    data.uu = this.unlockedUnits.map(up => [up[0].id, up[1]])
    data.e = this.experience
    data.l = this.level
    return data
  }
  restore(data: any) {
    this.name = data.n

    if (typeof data.a !== "undefined" && data.a != null && data.a.length > 0)
      this.avaiableUnits = data.a.map(a => this.game.allBase.find(u => u.id === a))
    if (typeof data.p !== "undefined" && data.p != null && data.p.length > 0)
      this.prodMod = data.p.map(p => [this.game.all.find(u => u.id === p[0]), Decimal(p[1])])
    if (typeof data.t !== "undefined" && data.t != null && data.t.length > 0)
      this.toUnlock = data.t.map(c => this.game.getCost(c))
    if (typeof data.um !== "undefined" && data.um != null && data.um.length > 0)
      this.unitMod = data.um.map(p => [this.game.all.find(u => u.id === p[0]), Decimal(p[1])])
    if (typeof data.up !== "undefined" && data.up != null && data.up.length > 0)
      this.unitPrice = data.up.map(p => [this.game.all.find(u => u.id === p[0]), Decimal(p[1])])
    if (typeof data.uu !== "undefined" && data.uu != null && data.uu.length > 0)
      this.unlockedUnits = data.uu.map(p => [this.game.allBase.find(u => u.id === p[0]), Decimal(p[1])])
    if (data.e)
      this.experience = new Decimal(data.e)

    if (data.l)
      this.level = data.l
  }
  generateAction(game: GameModel) {
    this.prestige = new Action("pres", "", null, this.toUnlock, "", game)
    this.prestige.priceF.forEach(pf => pf.growFactor = Decimal(10))
    this.prestige.unlocked = true
  }
}
