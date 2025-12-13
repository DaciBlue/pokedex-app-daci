import { evoMethodToSpanish } from "../services/pokeapi.js";

function EvoChip({ name, namesMap, spritesMap, onSelect }) {
  return (
    <span className="evoChip">
      {spritesMap[name] && (
        <img src={spritesMap[name]} alt={name} width="44" height="44" />
      )}
      <button className="evoBtn" onClick={() => onSelect(name)} type="button">
        {namesMap[name] || name}
      </button>
    </span>
  );
}

function ItemIcon({ item }) {
  if (!item?.icon) return null;
  return <img className="itemIcon" src={item.icon} alt={item.es} />;
}

function EdgeList({
  node,
  depth,
  namesMap,
  spritesMap,
  itemsMap,
  onSelect,
  indent = true,
}) {
  return (
    <>
      {node.next.map((edge) => {
        const method = evoMethodToSpanish(edge.details, itemsMap);

        const itemName =
          edge.details?.item?.name || edge.details?.held_item?.name || null;
        const item = itemName ? itemsMap?.[itemName] : null;

        return (
          <div
            key={`${node.name}->${edge.node.name}`}
            style={{ marginLeft: indent ? depth * 18 : 0 }}
          >
            <div className="evoRow">
              <EvoChip
                name={node.name}
                namesMap={namesMap}
                spritesMap={spritesMap}
                onSelect={onSelect}
              />

              <div className="evoBranchMethod">
                <span className="muted">→</span>
                {method && (
                  <div className="evoMethod">
                    {item && <ItemIcon item={item} />} {method}
                  </div>
                )}
              </div>

              <EvoChip
                name={edge.node.name}
                namesMap={namesMap}
                spritesMap={spritesMap}
                onSelect={onSelect}
              />
            </div>

            <EdgeList
              node={edge.node}
              depth={depth + 1}
              namesMap={namesMap}
              spritesMap={spritesMap}
              itemsMap={itemsMap}
              onSelect={onSelect}
              indent={indent}
            />
          </div>
        );
      })}
    </>
  );
}

function Branches({ tree, namesMap, spritesMap, itemsMap, onSelect }) {
  return (
    <div className="evoBranches">
      {/* Base (Eevee una sola vez, centrado/izq según media query) */}
      <div className="evoBranchLeft">
        <EvoChip
          name={tree.name}
          namesMap={namesMap}
          spritesMap={spritesMap}
          onSelect={onSelect}
        />
      </div>

      {/* Lista de ramas */}
      <div className="evoBranchList">
        {tree.next.map((edge) => {
          const method = evoMethodToSpanish(edge.details, itemsMap);
          const itemName =
            edge.details?.item?.name || edge.details?.held_item?.name || null;
          const item = itemName ? itemsMap?.[itemName] : null;

          return (
            <div key={`${tree.name}->${edge.node.name}`}>
              <div className="evoBranchLine">
                <div className="evoBranchMethod">
                  <span className="muted">→</span>
                  {method && (
                    <div className="evoMethod">
                      {item && <ItemIcon item={item} />} {method}
                    </div>
                  )}
                </div>

                <EvoChip
                  name={edge.node.name}
                  namesMap={namesMap}
                  spritesMap={spritesMap}
                  onSelect={onSelect}
                />
              </div>

              {/* Si esa rama sigue, se dibuja debajo */}
              {edge.node.next?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <EdgeList
                    node={edge.node}
                    depth={1}
                    namesMap={namesMap}
                    spritesMap={spritesMap}
                    itemsMap={itemsMap}
                    onSelect={onSelect}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EvolutionChain({
  tree,
  namesMap,
  spritesMap,
  itemsMap,
  onSelect,
}) {
  if (!tree) return null;

  const hasBranches = (tree.next?.length || 0) > 1;

  return (
    <div
      className={`card ${hasBranches ? "evoBranched" : "evoLinear"}`}
      style={{ maxWidth: 780, marginTop: 12 }}
    >
      {/* ✅ Título a la izquierda (mismo estilo que secciones) */}
      <div className="sectionTitle" style={{ marginBottom: 12 }}>
        Evoluciones
      </div>

      {hasBranches ? (
        <Branches
          tree={tree}
          namesMap={namesMap}
          spritesMap={spritesMap}
          itemsMap={itemsMap}
          onSelect={onSelect}
        />
      ) : (
        <EdgeList
          node={tree}
          depth={0}
          namesMap={namesMap}
          spritesMap={spritesMap}
          itemsMap={itemsMap}
          onSelect={onSelect}
          indent={false}
        />
      )}
    </div>
  );
}
