"use client";

let toggleExpandNotice = function () {
  const container = document.getElementById("notice-details");
  const button = document.getElementById("notice-button");

  if (container.style.display === "none") {
    container.style.display = "block";
    button.style.backgroundImage = "url('./icons/up_arrow.svg')";
    button.innerHTML = 'Hide';
  } else {
    container.style.display = "none";
    button.style.backgroundImage = "url('./icons/down_arrow.svg')";
    button.innerHTML = 'Show more';
  }
}

const PrivacyBanner = () => (
  <div>
    <div>
      <div className="notice-content">
        <span>This form stores personal information. </span>
        <button onClick={toggleExpandNotice} className="link-button" id="notice-button">
          Show more
        </button>
      </div>
    </div>
        
    <div id="notice-details" style={{display:"none"}}>
      <div className="notice-content">
        <ul >
          <li>The form contains questions that can be personally identifying.</li>
          <li>We only store the information you provide yourself or the information which have been filled out automatically in the form</li>
        </ul>
      </div>
    </div>
</div>
);

export default PrivacyBanner;
