const TopicCloud = ({ topics, active, onSelect }) => (
  <div className="topic-cloud" aria-label="Popular topics">
    <span className="topic-cloud-label">Popular topics</span>
    {topics.map(([topic, n]) => (
      <button key={topic} className={`chip small ${active === topic ? 'active' : ''}`} onClick={() => onSelect(active === topic ? '' : topic)}>
        #{topic} <span>{n}</span>
      </button>
    ))}
  </div>
);

export default TopicCloud;
