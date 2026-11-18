$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$docsDir = "C:\Program Files (x86)\Steam\steamapps\common\Satisfactory\CommunityResources\Docs"
$outDir = "c:\Users\mathe\Downloads\Projetos\Satisfactory\data"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

Write-Host "Reading pt-BR.json and en-US.json..."
$ptJson = [System.IO.File]::ReadAllText("$docsDir\pt-BR.json") | ConvertFrom-Json
$enJson = [System.IO.File]::ReadAllText("$docsDir\en-US.json") | ConvertFrom-Json

$ptByClass = @{}
foreach ($g in $ptJson) {
    $short = ($g.NativeClass -split '\.')[-1].TrimEnd("'")
    $ptByClass[$short] = $g.Classes
}

$enNameMap = @{}
foreach ($g in $enJson) {
    foreach ($c in $g.Classes) {
        if ($c.ClassName -and $c.mDisplayName) {
            $enNameMap[$c.ClassName] = $c.mDisplayName.Trim()
        }
    }
}

$md5 = [System.Security.Cryptography.MD5]::Create()

# Special Wiki filename overrides where in-game EN display name differs slightly from wiki image name
$wikiFileOverrides = @{
    'Desc_StandIn_C' = 'Iron_Plate.png'
    'Build_GeneratorCoal_C' = 'Coal-Powered_Generator.png'
    'Build_GeneratorFuel_C' = 'Fuel-Powered_Generator.png'
    'Build_GeneratorBiomass_Automated_C' = 'Biomass_Burner.png'
    'Build_FrackingExtractor_C' = 'Resource_Well_Extractor.png'
    'Build_FrackingSmasher_C' = 'Resource_Well_Pressurizer.png'
    'BP_ItemDescriptorPortableMiner_C' = 'Portable_Miner.png'
}

function Get-WikiImageUrls([string]$id, [string]$enName) {
    $fileName = if ($wikiFileOverrides.ContainsKey($id)) {
        $wikiFileOverrides[$id]
    } else {
        (($enName.Trim() -replace '\s+', '_') + ".png")
    }
    # Ensure first character is uppercase as required by MediaWiki
    if ($fileName.Length -gt 1) {
        $fileName = $fileName.Substring(0, 1).ToUpper() + $fileName.Substring(1)
    }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($fileName)
    $hash = [System.BitConverter]::ToString($md5.ComputeHash($bytes)).Replace('-', '').ToLower()
    $c1 = $hash.Substring(0, 1)
    $c2 = $hash.Substring(0, 2)
    $escaped = [uri]::EscapeDataString($fileName)
    return @{
        primary = "https://satisfactory.wiki.gg/images/$c1/$c2/$escaped"
        fallback = "https://static.wikia.nocookie.net/satisfactory_gamepedia_en/images/$c1/$c2/$escaped"
    }
}

function Parse-ItemPairs([string]$raw) {
    $result = @()
    if ([string]::IsNullOrWhiteSpace($raw)) { return ,$result }
    $matches = [regex]::Matches($raw, 'ItemClass="[^"]*\.([A-Za-z0-9_]+_C)[^"]*",Amount=([0-9.]+)')
    foreach ($m in $matches) {
        $result += [ordered]@{
            item = $m.Groups[1].Value
            rawAmount = [double]::Parse($m.Groups[2].Value, [System.Globalization.CultureInfo]::InvariantCulture)
        }
    }
    return ,$result
}

function Parse-ClassList([string]$raw) {
    $result = @()
    if ([string]::IsNullOrWhiteSpace($raw)) { return ,$result }
    $matches = [regex]::Matches($raw, '\.([A-Za-z0-9_]+_C)')
    foreach ($m in $matches) {
        $val = $m.Groups[1].Value
        if ($result -notcontains $val) {
            $result += $val
        }
    }
    return ,$result
}

function Parse-ColorHex([string]$raw, [string]$defaultHex = "#f59e0b") {
    if ([string]::IsNullOrWhiteSpace($raw)) { return $defaultHex }
    $m = [regex]::Match($raw, 'B=([0-9.]+),G=([0-9.]+),R=([0-9.]+)')
    if ($m.Success) {
        $b = [int][Math]::Min([Math]::Max([double]::Parse($m.Groups[1].Value, [System.Globalization.CultureInfo]::InvariantCulture), 0), 255)
        $g = [int][Math]::Min([Math]::Max([double]::Parse($m.Groups[2].Value, [System.Globalization.CultureInfo]::InvariantCulture), 0), 255)
        $r = [int][Math]::Min([Math]::Max([double]::Parse($m.Groups[3].Value, [System.Globalization.CultureInfo]::InvariantCulture), 0), 255)
        if ($r -eq 0 -and $g -eq 0 -and $b -eq 0) { return "#3b2f2f" }
        return ("#{0:x2}{1:x2}{2:x2}" -f $r, $g, $b)
    }
    return $defaultHex
}

$rawResourceIds = @{}
foreach ($r in $ptByClass['FGResourceDescriptor']) {
    $rawResourceIds[$r.ClassName] = $true
}

$descriptorClasses = @(
    'FGResourceDescriptor',
    'FGItemDescriptor',
    'FGItemDescriptorBiomass',
    'FGItemDescriptorNuclearFuel',
    'FGItemDescriptorPowerBoosterFuel',
    'FGPowerShardDescriptor',
    'FGConsumableDescriptor',
    'FGEquipmentDescriptor',
    'FGAmmoTypeProjectile',
    'FGAmmoTypeInstantHit',
    'FGAmmoTypeSpreadshot'
)

$stackMap = @{
    'SS_ONE' = 1
    'SS_SMALL' = 50
    'SS_MEDIUM' = 100
    'SS_BIG' = 200
    'SS_HUGE' = 500
    'SS_FLUID' = 50
}

$items = [ordered]@{}
foreach ($clsName in $descriptorClasses) {
    if (-not $ptByClass.ContainsKey($clsName)) { continue }
    foreach ($it in $ptByClass[$clsName]) {
        $id = $it.ClassName
        if ([string]::IsNullOrWhiteSpace($it.mDisplayName)) { continue }
        $form = switch ($it.mForm) {
            'RF_LIQUID' { 'LIQUID' }
            'RF_GAS' { 'GAS' }
            default { 'SOLID' }
        }
        $isFluid = ($form -eq 'LIQUID' -or $form -eq 'GAS')
        $rawEnergy = if ($it.mEnergyValue) { [double]::Parse($it.mEnergyValue, [System.Globalization.CultureInfo]::InvariantCulture) } else { 0.0 }
        $energyMj = if ($isFluid) { [Math]::Round($rawEnergy * 1000.0, 4) } else { [Math]::Round($rawEnergy, 4) }
        $sinkPts = if ($it.mResourceSinkPoints) { [int]$it.mResourceSinkPoints } else { 0 }
        $radioactive = if ($it.mRadioactiveDecay) { [double]::Parse($it.mRadioactiveDecay, [System.Globalization.CultureInfo]::InvariantCulture) } else { 0.0 }
        $stackSize = if ($stackMap.ContainsKey($it.mStackSize)) { $stackMap[$it.mStackSize] } else { 100 }
        $enName = if ($enNameMap.ContainsKey($id)) { $enNameMap[$id] } else { $it.mDisplayName }

        $cat = "Peças & Componentes"
        if ($rawResourceIds.ContainsKey($id)) {
            $cat = "Recursos Brutos"
        } elseif ($clsName -in @('FGEquipmentDescriptor', 'FGConsumableDescriptor', 'FGAmmoTypeProjectile', 'FGAmmoTypeInstantHit', 'FGAmmoTypeSpreadshot')) {
            $cat = "Equipamentos"
        } elseif ($clsName -eq 'FGItemDescriptorBiomass' -or $id -match 'Leaves|Wood|Mycelia|Biomass|Biofuel|HogParts|SpitterParts|HatcherParts|StingerParts|AlienProtein|AlienDNACapsule') {
            $cat = "Biomassa"
        } elseif ($id -match 'Ingot') {
            $cat = "Lingotes"
        } elseif ($id -match 'SpaceElevatorPart') {
            $cat = "Elevador Espacial"
        } elseif ($id -match 'Nuclear|Uranium|Plutonium|Ficsonium|NonFissible') {
            $cat = "Nuclear"
        } elseif ($id -match 'Quantum|DarkMatter|DarkEnergy|SAM|TimeCrystal|Ficsite|Singularity|Superposition|Temporal|PowerMatrix') {
            $cat = "Quântico & Alienígena"
        } elseif ($id -match 'Plastic|Rubber|Polymer|HeavyOil|LiquidFuel|TurboFuel|RocketFuel|IonizedFuel|PetroleumCoke|FluidCanister|GasTank|Packaged|Alumina|Sulfuric|Nitric|Dissolved') {
            $cat = "Fluidos & Refinaria"
        } elseif ($id -match 'Wire|Cable|CircuitBoard|HighSpeed|Computer|CrystalOscillator|Stator|Rotor|Motor|Electromagnetic|RadioControl|CoolingSystem|Battery') {
            $cat = "Eletrônicos & Motores"
        } elseif ($id -match 'Gift|CandyCane|Snow|Xmas|Fireworks') {
            $cat = "FICSMAS"
        }

        $urls = Get-WikiImageUrls $id $enName

        $items[$id] = [ordered]@{
            id = $id
            name = $it.mDisplayName
            nameEn = $enName
            description = $it.mDescription
            abbrev = $it.mAbbreviatedDisplayName
            form = $form
            unit = if ($isFluid) { "m³" } else { "un" }
            isFluid = $isFluid
            isRawResource = [bool]$rawResourceIds.ContainsKey($id)
            energyMj = $energyMj
            sinkPoints = $sinkPts
            radioactive = $radioactive
            stackSize = $stackSize
            category = $cat
            color = Parse-ColorHex $it.mFluidColor "#f59e0b"
            wikiImage = $urls.primary
            wikiImageFallback = $urls.fallback
        }
    }
}

$recipeMeta = @{}
foreach ($s in $ptByClass['FGSchematic']) {
    $sType = $s.mType
    $sTier = [int]$s.mTechTier
    $sName = $s.mDisplayName
    foreach ($u in $s.mUnlocks) {
        if ($u.Class -eq 'BP_UnlockRecipe_C' -and $u.mRecipes) {
            $rList = Parse-ClassList $u.mRecipes
            foreach ($rId in $rList) {
                $recipeMeta[$rId] = [ordered]@{
                    unlockType = $sType
                    tier = $sTier
                    schematicName = $sName
                }
            }
        }
    }
}

$buildCostsByProduct = @{}
$descToBuildMap = @{
    'Desc_SmelterMk1_C' = 'Build_SmelterMk1_C'
    'Desc_FoundryMk1_C' = 'Build_FoundryMk1_C'
    'Desc_ConstructorMk1_C' = 'Build_ConstructorMk1_C'
    'Desc_AssemblerMk1_C' = 'Build_AssemblerMk1_C'
    'Desc_ManufacturerMk1_C' = 'Build_ManufacturerMk1_C'
    'Desc_OilRefinery_C' = 'Build_OilRefinery_C'
    'Desc_Packager_C' = 'Build_Packager_C'
    'Desc_Blender_C' = 'Build_Blender_C'
    'Desc_HadronCollider_C' = 'Build_HadronCollider_C'
    'Desc_Converter_C' = 'Build_Converter_C'
    'Desc_QuantumEncoder_C' = 'Build_QuantumEncoder_C'
    'Desc_MinerMk1_C' = 'Build_MinerMk1_C'
    'Desc_MinerMk2_C' = 'Build_MinerMk2_C'
    'Desc_MinerMk3_C' = 'Build_MinerMk3_C'
    'Desc_OilPump_C' = 'Build_OilPump_C'
    'Desc_WaterPump_C' = 'Build_WaterPump_C'
    'Desc_FrackingSmasher_C' = 'Build_FrackingSmasher_C'
    'Desc_FrackingExtractor_C' = 'Build_FrackingExtractor_C'
    'Desc_GeneratorBiomass_Automated_C' = 'Build_GeneratorBiomass_Automated_C'
    'Desc_GeneratorCoal_C' = 'Build_GeneratorCoal_C'
    'Desc_GeneratorFuel_C' = 'Build_GeneratorFuel_C'
    'Desc_GeneratorNuclear_C' = 'Build_GeneratorNuclear_C'
}

foreach ($r in $ptByClass['FGRecipe']) {
    if ($r.mProducedIn -match 'BP_BuildGun_C|FGBuildGun') {
        $prods = Parse-ItemPairs $r.mProduct
        $ings = Parse-ItemPairs $r.mIngredients
        if ($prods.Count -gt 0) {
            $prodId = $prods[0].item
            $buildId = if ($descToBuildMap.ContainsKey($prodId)) { $descToBuildMap[$prodId] } else { $prodId -replace '^Desc_', 'Build_' }
            $costArr = @()
            foreach ($ing in $ings) {
                $costArr += [ordered]@{ item = $ing.item; amount = $ing.rawAmount }
            }
            $buildCostsByProduct[$buildId] = $costArr
        }
    }
}

$machines = [ordered]@{}
$allManuf = @()
if ($ptByClass.ContainsKey('FGBuildableManufacturer')) { $allManuf += $ptByClass['FGBuildableManufacturer'] }
if ($ptByClass.ContainsKey('FGBuildableManufacturerVariablePower')) { $allManuf += $ptByClass['FGBuildableManufacturerVariablePower'] }

foreach ($m in $allManuf) {
    $id = $m.ClassName
    $enName = if ($enNameMap.ContainsKey($id)) { $enNameMap[$id] } else { $m.mDisplayName }
    $basePower = [double]::Parse($m.mPowerConsumption, [System.Globalization.CultureInfo]::InvariantCulture)
    $powerExp = [double]::Parse($m.mPowerConsumptionExponent, [System.Globalization.CultureInfo]::InvariantCulture)
    $sloopSlots = [int]$m.mProductionShardSlotSize
    $sloopMult = [double]::Parse($m.mProductionShardBoostMultiplier, [System.Globalization.CultureInfo]::InvariantCulture)
    $isVarPower = ($m.PSObject.Properties.Name -contains 'mEstimatedMaximumPowerConsumption')
    $estMin = if ($isVarPower) { [double]::Parse($m.mEstimatedMininumPowerConsumption, [System.Globalization.CultureInfo]::InvariantCulture) } else { $basePower }
    $estMax = if ($isVarPower) { [double]::Parse($m.mEstimatedMaximumPowerConsumption, [System.Globalization.CultureInfo]::InvariantCulture) } else { $basePower }
    $urls = Get-WikiImageUrls $id $enName

    $machines[$id] = [ordered]@{
        id = $id
        name = $m.mDisplayName
        nameEn = $enName
        description = $m.mDescription
        basePowerMw = $basePower
        isVariablePower = [bool]$isVarPower
        estMinPowerMw = $estMin
        estMaxPowerMw = $estMax
        powerExponent = [Math]::Round($powerExp, 6)
        sloopSlots = $sloopSlots
        sloopMultiplier = $sloopMult
        buildCost = if ($buildCostsByProduct.ContainsKey($id)) { $buildCostsByProduct[$id] } else { @() }
        wikiImage = $urls.primary
        wikiImageFallback = $urls.fallback
    }
}

$extractors = [ordered]@{}
$solidOres = @(
    'Desc_OreIron_C', 'Desc_OreCopper_C', 'Desc_Stone_C', 'Desc_Coal_C',
    'Desc_OreGold_C', 'Desc_RawQuartz_C', 'Desc_Sulfur_C', 'Desc_OreBauxite_C',
    'Desc_OreUranium_C', 'Desc_SAM_C'
)

foreach ($ex in $ptByClass['FGBuildableResourceExtractor']) {
    $id = $ex.ClassName
    $enName = if ($enNameMap.ContainsKey($id)) { $enNameMap[$id] } else { $ex.mDisplayName }
    $itemsPerCycle = [double]::Parse($ex.mItemsPerCycle, [System.Globalization.CultureInfo]::InvariantCulture)
    $cycleTime = [double]::Parse($ex.mExtractCycleTime, [System.Globalization.CultureInfo]::InvariantCulture)
    $isFluid = $ex.mAllowedResourceForms -match 'RF_LIQUID|RF_GAS'
    $unitPerCycle = if ($isFluid) { $itemsPerCycle / 1000.0 } else { $itemsPerCycle }
    $baseRatePerMin = [Math]::Round($unitPerCycle * (60.0 / $cycleTime), 4)
    $basePower = [double]::Parse($ex.mPowerConsumption, [System.Globalization.CultureInfo]::InvariantCulture)
    $powerExp = [double]::Parse($ex.mPowerConsumptionExponent, [System.Globalization.CultureInfo]::InvariantCulture)
    $allowed = if ($ex.mOnlyAllowCertainResources -eq 'True') { Parse-ClassList $ex.mAllowedResources } else { $solidOres }
    $urls = Get-WikiImageUrls $id $enName

    $extractors[$id] = [ordered]@{
        id = $id
        name = $ex.mDisplayName
        nameEn = $enName
        description = $ex.mDescription
        baseRatePerMin = $baseRatePerMin
        supportsPurity = $true
        isFluid = [bool]$isFluid
        basePowerMw = $basePower
        powerExponent = [Math]::Round($powerExp, 6)
        allowedResources = $allowed
        buildCost = if ($buildCostsByProduct.ContainsKey($id)) { $buildCostsByProduct[$id] } else { @() }
        wikiImage = $urls.primary
        wikiImageFallback = $urls.fallback
    }
}

foreach ($wp in $ptByClass['FGBuildableWaterPump']) {
    $id = $wp.ClassName
    $enName = if ($enNameMap.ContainsKey($id)) { $enNameMap[$id] } else { $wp.mDisplayName }
    $itemsPerCycle = [double]::Parse($wp.mItemsPerCycle, [System.Globalization.CultureInfo]::InvariantCulture)
    $cycleTime = [double]::Parse($wp.mExtractCycleTime, [System.Globalization.CultureInfo]::InvariantCulture)
    $baseRatePerMin = [Math]::Round(($itemsPerCycle / 1000.0) * (60.0 / $cycleTime), 4)
    $basePower = [double]::Parse($wp.mPowerConsumption, [System.Globalization.CultureInfo]::InvariantCulture)
    $powerExp = [double]::Parse($wp.mPowerConsumptionExponent, [System.Globalization.CultureInfo]::InvariantCulture)
    $urls = Get-WikiImageUrls $id $enName

    $extractors[$id] = [ordered]@{
        id = $id
        name = $wp.mDisplayName
        nameEn = $enName
        description = $wp.mDescription
        baseRatePerMin = $baseRatePerMin
        supportsPurity = $false
        isFluid = $true
        basePowerMw = $basePower
        powerExponent = [Math]::Round($powerExp, 6)
        allowedResources = @('Desc_Water_C')
        buildCost = if ($buildCostsByProduct.ContainsKey($id)) { $buildCostsByProduct[$id] } else { @() }
        wikiImage = $urls.primary
        wikiImageFallback = $urls.fallback
    }
}

$frackAct = $ptByClass['FGBuildableFrackingActivator'][0]
$frackExt = $ptByClass['FGBuildableFrackingExtractor'][0]
$frackPower = [double]::Parse($frackAct.mPowerConsumption, [System.Globalization.CultureInfo]::InvariantCulture)
$frackExp = [double]::Parse($frackAct.mPowerConsumptionExponent, [System.Globalization.CultureInfo]::InvariantCulture)
$frackUrls = Get-WikiImageUrls 'Build_FrackingExtractor_C' 'Resource Well Extractor'
$extractors['Build_FrackingExtractor_C'] = [ordered]@{
    id = 'Build_FrackingExtractor_C'
    name = $frackExt.mDisplayName
    nameEn = "Resource Well Extractor"
    description = $frackExt.mDescription
    baseRatePerMin = 60.0
    supportsPurity = $true
    isFluid = $true
    basePowerMw = $frackPower
    powerExponent = [Math]::Round($frackExp, 6)
    allowedResources = @('Desc_NitrogenGas_C', 'Desc_LiquidOil_C', 'Desc_Water_C')
    buildCost = if ($buildCostsByProduct.ContainsKey('Build_FrackingSmasher_C')) { $buildCostsByProduct['Build_FrackingSmasher_C'] } else { @() }
    wikiImage = $frackUrls.primary
    wikiImageFallback = $frackUrls.fallback
}

$validMachineIds = @($machines.Keys)
$recipes = [ordered]@{}

foreach ($r in $ptByClass['FGRecipe']) {
    $id = $r.ClassName
    $prodInList = Parse-ClassList $r.mProducedIn
    $machineId = $null
    foreach ($p in $prodInList) {
        if ($validMachineIds -contains $p) {
            $machineId = $p
            break
        }
    }
    if (-not $machineId) { continue }

    $duration = [double]::Parse($r.mManufactoringDuration, [System.Globalization.CultureInfo]::InvariantCulture)
    if ($duration -le 0) { $duration = 1.0 }
    $cyclesPerMin = 60.0 / $duration

    $rawIngs = Parse-ItemPairs $r.mIngredients
    $ings = @()
    foreach ($ri in $rawIngs) {
        $itObj = $items[$ri.item]
        $isFl = if ($itObj) { $itObj.isFluid } else { $false }
        $normAmt = if ($isFl) { [Math]::Round($ri.rawAmount / 1000.0, 4) } else { $ri.rawAmount }
        $rate = [Math]::Round($normAmt * $cyclesPerMin, 4)
        $ings += [ordered]@{ item = $ri.item; amount = $normAmt; ratePerMin = $rate }
    }

    $rawProds = Parse-ItemPairs $r.mProduct
    $prods = @()
    foreach ($rp in $rawProds) {
        $itObj = $items[$rp.item]
        $isFl = if ($itObj) { $itObj.isFluid } else { $false }
        $normAmt = if ($isFl) { [Math]::Round($rp.rawAmount / 1000.0, 4) } else { $rp.rawAmount }
        $rate = [Math]::Round($normAmt * $cyclesPerMin, 4)
        $prods += [ordered]@{ item = $rp.item; amount = $normAmt; ratePerMin = $rate }
    }

    if ($prods.Count -eq 0) { continue }

    $meta = if ($recipeMeta.ContainsKey($id)) { $recipeMeta[$id] } else { @{ unlockType = 'EST_Milestone'; tier = 0; schematicName = '' } }
    $isAlt = ($meta.unlockType -eq 'EST_Alternate') -or ($id -match 'Alternate') -or ($r.mDisplayName -match '^Alternativa:')
    $isFicsmas = ($r.mRelevantEvents -match 'EV_Christmas') -or ($id -match 'Xmas|Snow|CandyCane|Fireworks|Gift')
    $primaryProd = $prods[0].item
    $isConverterOre = ($machineId -eq 'Build_Converter_C') -and ($rawResourceIds.ContainsKey($primaryProd))
    $isUnpackage = ($machineId -eq 'Build_Packager_C') -and ($id -match 'Unpackage')
    $isPackage = ($machineId -eq 'Build_Packager_C') -and (-not $isUnpackage)

    $machObj = $machines[$machineId]
    $pConst = [double]::Parse($r.mVariablePowerConsumptionConstant, [System.Globalization.CultureInfo]::InvariantCulture)
    $pFactor = [double]::Parse($r.mVariablePowerConsumptionFactor, [System.Globalization.CultureInfo]::InvariantCulture)

    $minMw = $machObj.basePowerMw
    $maxMw = $machObj.basePowerMw
    $avgMw = $machObj.basePowerMw
    if ($machObj.isVariablePower) {
        $minMw = $pConst
        $maxMw = $pConst + $pFactor
        $avgMw = $pConst + (0.5 * $pFactor)
    }

    $enName = if ($enNameMap.ContainsKey($id)) { $enNameMap[$id] } else { $r.mDisplayName }
    $cleanName = $r.mDisplayName -replace '^Alternativa:\s*', ''
    $cleanNameEn = $enName -replace '^Alternate:\s*', ''

    $recipes[$id] = [ordered]@{
        id = $id
        name = $r.mDisplayName
        cleanName = $cleanName
        nameEn = $enName
        cleanNameEn = $cleanNameEn
        machine = $machineId
        duration = $duration
        cyclesPerMin = [Math]::Round($cyclesPerMin, 4)
        ingredients = $ings
        products = $prods
        primaryProduct = $primaryProd
        isAlternate = [bool]$isAlt
        isConverterOre = [bool]$isConverterOre
        isPackage = [bool]$isPackage
        isUnpackage = [bool]$isUnpackage
        isFicsmas = [bool]$isFicsmas
        unlockType = $meta.unlockType
        tier = $meta.tier
        schematicName = $meta.schematicName
        minPowerMw = $minMw
        maxPowerMw = $maxMw
        avgPowerMw = $avgMw
    }
}

$belts = @()
foreach ($b in $ptByClass['FGBuildableConveyorBelt']) {
    $spd = [double]::Parse($b.mSpeed, [System.Globalization.CultureInfo]::InvariantCulture) / 2.0
    $enName = if ($enNameMap.ContainsKey($b.ClassName)) { $enNameMap[$b.ClassName] } else { $b.mDisplayName }
    $urls = Get-WikiImageUrls $b.ClassName $enName
    $belts += [ordered]@{
        id = $b.ClassName
        name = $b.mDisplayName
        nameEn = $enName
        ratePerMin = [Math]::Round($spd, 1)
        wikiImage = $urls.primary
        wikiImageFallback = $urls.fallback
    }
}
$belts = $belts | Sort-Object ratePerMin

$pipes = @(
    [ordered]@{ id = 'Build_Pipeline_C'; name = 'Tubulação v.1'; nameEn = 'Pipeline Mk.1'; ratePerMin = 300.0 },
    [ordered]@{ id = 'Build_PipelineMK2_C'; name = 'Tubulação v.2'; nameEn = 'Pipeline Mk.2'; ratePerMin = 600.0 }
)

$generators = [ordered]@{}
$genClasses = @()
if ($ptByClass.ContainsKey('FGBuildableGeneratorFuel')) { $genClasses += $ptByClass['FGBuildableGeneratorFuel'] }
if ($ptByClass.ContainsKey('FGBuildableGeneratorNuclear')) { $genClasses += $ptByClass['FGBuildableGeneratorNuclear'] }

foreach ($g in $genClasses) {
    $id = $g.ClassName
    $enName = if ($enNameMap.ContainsKey($id)) { $enNameMap[$id] } else { $g.mDisplayName }
    $powerMw = [double]::Parse($g.mPowerProduction, [System.Globalization.CultureInfo]::InvariantCulture)
    $suppRatio = [double]::Parse($g.mSupplementalToPowerRatio, [System.Globalization.CultureInfo]::InvariantCulture)
    $waterPerMin = if ($g.mRequiresSupplementalResource -eq 'True') { [Math]::Round(($suppRatio * $powerMw * 60.0) / 1000.0, 4) } else { 0.0 }
    $urls = Get-WikiImageUrls $id $enName

    $fuels = @()
    foreach ($f in $g.mFuel) {
        $fId = $f.mFuelClass
        if (-not $items.Contains($fId)) { continue }
        $fItem = $items[$fId]
        if ($fItem.energyMj -le 0) { continue }
        $burnTimeSec = $fItem.energyMj / $powerMw
        $ratePerMin = [Math]::Round(60.0 / $burnTimeSec, 4)
        $byprodId = $f.mByproduct
        $byprodAmt = if ($f.mByproductAmount) { [double]::Parse($f.mByproductAmount, [System.Globalization.CultureInfo]::InvariantCulture) } else { 0.0 }
        $byprodRate = if ($byprodId) { [Math]::Round($byprodAmt * $ratePerMin, 4) } else { 0.0 }

        $fuels += [ordered]@{
            item = $fId
            burnTimeSec = [Math]::Round($burnTimeSec, 4)
            ratePerMin = $ratePerMin
            waterPerMin = $waterPerMin
            byproduct = if ($byprodId) { $byprodId } else { $null }
            byproductAmount = $byprodAmt
            byproductRatePerMin = $byprodRate
        }
    }

    $generators[$id] = [ordered]@{
        id = $id
        name = $g.mDisplayName
        nameEn = $enName
        description = $g.mDescription
        powerProductionMw = $powerMw
        waterPerMin = $waterPerMin
        fuels = $fuels
        buildCost = if ($buildCostsByProduct.ContainsKey($id)) { $buildCostsByProduct[$id] } else { @() }
        wikiImage = $urls.primary
        wikiImageFallback = $urls.fallback
    }
}

$dataset = [ordered]@{
    version = "1.0+"
    generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    items = $items
    machines = $machines
    extractors = $extractors
    recipes = $recipes
    belts = $belts
    pipes = $pipes
    generators = $generators
}

$jsonStr = $dataset | ConvertTo-Json -Depth 10 -Compress
[System.IO.File]::WriteAllText("$outDir\satisfactory-data.json", $jsonStr, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$outDir\satisfactory-data.js", "window.SATISFACTORY_DATA = $jsonStr;", [System.Text.Encoding]::UTF8)

Write-Host "Updated satisfactory-data.js with direct MD5 hashed wiki image URLs!"
